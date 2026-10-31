import copy
import re
import datetime
from bson import ObjectId

class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class InsertManyResult:
    def __init__(self, inserted_ids):
        self.inserted_ids = inserted_ids

class UpdateResult:
    def __init__(self, matched_count, modified_count, upserted_id=None):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.upserted_id = upserted_id

class DeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count

class AsyncCursor:
    def __init__(self, docs):
        self._docs = docs
        self._index = 0
        self._skip_val = 0
        self._limit_val = None

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            for key, direct in reversed(key_or_list):
                reverse = (direct == -1)
                self._docs.sort(key=lambda d: str(d.get(key, "")), reverse=reverse)
        elif isinstance(key_or_list, str):
            reverse = (direction == -1)
            self._docs.sort(key=lambda d: str(d.get(key_or_list, "")), reverse=reverse)
        return self

    def skip(self, count):
        self._skip_val = count
        return self

    def limit(self, count):
        self._limit_val = count
        return self

    def _get_sliced(self):
        docs = self._docs[self._skip_val:]
        if self._limit_val is not None:
            docs = docs[:self._limit_val]
        return docs

    async def to_list(self, length=None):
        docs = self._get_sliced()
        if length is not None:
            docs = docs[:length]
        return [copy.deepcopy(d) for d in docs]

    def __aiter__(self):
        self._iter_docs = self._get_sliced()
        self._iter_idx = 0
        return self

    async def __anext__(self):
        if self._iter_idx >= len(self._iter_docs):
            raise StopAsyncIteration
        doc = self._iter_docs[self._iter_idx]
        self._iter_idx += 1
        return copy.deepcopy(doc)

def _matches_filter(doc: dict, filter_dict: dict) -> bool:
    if not filter_dict:
        return True
    for key, expected in filter_dict.items():
        if key == "$or":
            if not any(_matches_filter(doc, sub) for sub in expected):
                return False
            continue
        if key == "$and":
            if not all(_matches_filter(doc, sub) for sub in expected):
                return False
            continue

        val = doc.get(key)
        if isinstance(expected, dict):
            for op, op_val in expected.items():
                if op == "$eq" and val != op_val:
                    return False
                elif op == "$ne" and val == op_val:
                    return False
                elif op == "$in" and val not in op_val:
                    return False
                elif op == "$nin" and val in op_val:
                    return False
                elif op == "$gt" and (val is None or val <= op_val):
                    return False
                elif op == "$gte" and (val is None or val < op_val):
                    return False
                elif op == "$lt" and (val is None or val >= op_val):
                    return False
                elif op == "$lte" and (val is None or val > op_val):
                    return False
                elif op == "$regex":
                    pattern = op_val
                    options = expected.get("$options", "")
                    flags = re.IGNORECASE if "i" in options else 0
                    if not re.search(pattern, str(val or ""), flags=flags):
                        return False
        else:
            if str(val) != str(expected) and val != expected:
                return False
    return True

class ResilientCollection:
    def __init__(self, name: str):
        self.name = name
        self.documents = []

    async def find_one(self, filter_dict=None, projection=None, sort=None, **kwargs):
        filter_dict = filter_dict or {}
        matched = [d for d in self.documents if _matches_filter(d, filter_dict)]
        if not matched:
            return None
        if sort:
            cursor = AsyncCursor(matched)
            cursor.sort(sort)
            matched = cursor._docs
        return copy.deepcopy(matched[0])

    def find(self, filter_dict=None, projection=None):
        filter_dict = filter_dict or {}
        matched = [d for d in self.documents if _matches_filter(d, filter_dict)]
        return AsyncCursor(matched)

    async def insert_one(self, doc: dict):
        new_doc = copy.deepcopy(doc)
        if "_id" not in new_doc:
            new_doc["_id"] = ObjectId()
        self.documents.append(new_doc)
        return InsertOneResult(new_doc["_id"])

    async def insert_many(self, docs: list):
        ids = []
        for d in docs:
            res = await self.insert_one(d)
            ids.append(res.inserted_id)
        return InsertManyResult(ids)

    async def update_one(self, filter_dict: dict, update_dict: dict, upsert: bool = False):
        for doc in self.documents:
            if _matches_filter(doc, filter_dict):
                if "$set" in update_dict:
                    for k, v in update_dict["$set"].items():
                        doc[k] = copy.deepcopy(v)
                if "$push" in update_dict:
                    for k, v in update_dict["$push"].items():
                        if k not in doc or not isinstance(doc[k], list):
                            doc[k] = []
                        doc[k].append(copy.deepcopy(v))
                return UpdateResult(matched_count=1, modified_count=1)

        if upsert:
            new_doc = copy.deepcopy(filter_dict)
            if "$set" in update_dict:
                new_doc.update(copy.deepcopy(update_dict["$set"]))
            res = await self.insert_one(new_doc)
            return UpdateResult(matched_count=0, modified_count=0, upserted_id=res.inserted_id)

        return UpdateResult(matched_count=0, modified_count=0)

    async def update_many(self, filter_dict: dict, update_dict: dict):
        matched = 0
        modified = 0
        for doc in self.documents:
            if _matches_filter(doc, filter_dict):
                matched += 1
                if "$set" in update_dict:
                    for k, v in update_dict["$set"].items():
                        doc[k] = copy.deepcopy(v)
                    modified += 1
        return UpdateResult(matched_count=matched, modified_count=modified)

    async def delete_one(self, filter_dict: dict):
        for idx, doc in enumerate(self.documents):
            if _matches_filter(doc, filter_dict):
                del self.documents[idx]
                return DeleteResult(deleted_count=1)
        return DeleteResult(deleted_count=0)

    async def count_documents(self, filter_dict=None):
        filter_dict = filter_dict or {}
        return len([d for d in self.documents if _matches_filter(d, filter_dict)])

    async def distinct(self, key: str, filter_dict=None):
        filter_dict = filter_dict or {}
        vals = set()
        for doc in self.documents:
            if _matches_filter(doc, filter_dict):
                if key in doc:
                    vals.add(doc[key])
        return list(vals)

    async def create_index(self, keys, **kwargs):
        return "idx_" + self.name

class ResilientDatabase:
    def __init__(self):
        self._collections = {}

    def __getattr__(self, name: str) -> ResilientCollection:
        if name not in self._collections:
            self._collections[name] = ResilientCollection(name)
        return self._collections[name]

    def __getitem__(self, name: str) -> ResilientCollection:
        return self.__getattr__(name)
