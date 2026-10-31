import io
import os
import datetime
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.core.config import settings

PRIMARY_COLOR = colors.HexColor("#79566F")
DARK_COLOR = colors.HexColor("#493344")
ACCENT_COLOR = colors.HexColor("#C08497")
LIGHT_BG = colors.HexColor("#F7EDE5")
ALERT_RED = colors.HexColor("#DC2626")
TEXT_MUTED = colors.HexColor("#806C7B")

def generate_inspection_pdf(
    property_data: Dict[str, Any],
    inspection_data: Optional[Dict[str, Any]] = None,
    weather_data: Optional[Dict[str, Any]] = None,
    triage_data: Optional[Dict[str, Any]] = None,
    report_title: str = "Diagnostic Property Pathology Dossier",
) -> bytes:
    """
    Generates a professional PDF dossier using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=DARK_COLOR,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=TEXT_MUTED,
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=PRIMARY_COLOR,
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=DARK_COLOR,
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=DARK_COLOR,
    )
    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7,
        leading=9,
        textColor=TEXT_MUTED,
    )

    elements = []

    # 1. Header Banner
    elements.append(Paragraph("PROPCARE NW — PREDICTIVE PROPERTY INTELLIGENCE", subtitle_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(report_title, title_style))
    elements.append(Spacer(1, 4))
    now_str = datetime.datetime.now().strftime("%d %B %Y, %H:%M UTC")
    elements.append(Paragraph(f"Generated: {now_str} &bull; Statutory Standard: Awaab's Law (Section 10A)", subtitle_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=4, spaceAfter=12))

    # 2. Property Overview Table
    elements.append(Paragraph("1. Property & Asset Metadata", section_heading))
    prop_rows = [
        [
            Paragraph("<b>Property Name</b>", table_cell),
            Paragraph(property_data.get("property_name", "N/A"), table_cell),
            Paragraph("<b>Building Type</b>", table_cell),
            Paragraph(property_data.get("building_type", "Residential"), table_cell),
        ],
        [
            Paragraph("<b>Address</b>", table_cell),
            Paragraph(f"{property_data.get('address', '')}, {property_data.get('postal_code', '')}", table_cell),
            Paragraph("<b>Construction Year</b>", table_cell),
            Paragraph(str(property_data.get("build_year", "N/A")), table_cell),
        ],
        [
            Paragraph("<b>Organization</b>", table_cell),
            Paragraph(property_data.get("organization", "Housing Trust"), table_cell),
            Paragraph("<b>Current Risk Status</b>", table_cell),
            Paragraph(f"<b>{property_data.get('risk_level', 'low').upper()}</b> ({property_data.get('risk_score', 0)}/100)", table_cell),
        ],
    ]
    t1 = Table(prop_rows, colWidths=[110, 150, 110, 150])
    t1.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6D5DC")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(t1)
    elements.append(Spacer(1, 10))

    # 3. Inspection Diagnostic Observations
    if inspection_data:
        elements.append(Paragraph("2. Forensic Inspection Observations", section_heading))
        symptoms_str = ", ".join(inspection_data.get("symptom_tags", [])) or "None recorded"
        insp_rows = [
            [Paragraph("<b>Inspection Zone</b>", table_cell), Paragraph(inspection_data.get("inspection_zone", "General"), table_cell)],
            [Paragraph("<b>Room / Location</b>", table_cell), Paragraph(f"{inspection_data.get('room_name', '')} ({inspection_data.get('floor', '')})", table_cell)],
            [Paragraph("<b>Surveyor</b>", table_cell), Paragraph(inspection_data.get("inspector_name", "Diagnostic Inspector"), table_cell)],
            [Paragraph("<b>Observed Symptoms</b>", table_cell), Paragraph(symptoms_str, table_cell)],
            [Paragraph("<b>Surveyor Notes</b>", table_cell), Paragraph(inspection_data.get("notes", "No additional notes."), table_cell)],
        ]
        t2 = Table(insp_rows, colWidths=[130, 390])
        t2.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EFE4EC")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6D5DC")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(t2)
        elements.append(Spacer(1, 10))

    # 4. Weather & Dew Point Analysis
    if weather_data:
        elements.append(Paragraph("3. Environmental & Psychrometric Telemetry", section_heading))
        cur = weather_data.get("current", {})
        dp_info = weather_data.get("dew_point_analysis", {})
        w_rows = [
            [
                Paragraph("<b>Ambient Temperature</b>", table_cell),
                Paragraph(f"{cur.get('temperature', 'N/A')} °C", table_cell),
                Paragraph("<b>Calculated Dew Point</b>", table_cell),
                Paragraph(f"{dp_info.get('magnus_dew_point', 'N/A')} °C", table_cell),
            ],
            [
                Paragraph("<b>Relative Humidity</b>", table_cell),
                Paragraph(f"{cur.get('relative_humidity', 'N/A')}%", table_cell),
                Paragraph("<b>Condensation Vulnerability</b>", table_cell),
                Paragraph(f"<b>{dp_info.get('condensation_risk', 'Normal')}</b> ({dp_info.get('temp_to_dew_diff', 'N/A')}°C margin)", table_cell),
            ],
        ]
        t3 = Table(w_rows, colWidths=[130, 130, 130, 130])
        t3.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6D5DC")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(t3)
        elements.append(Spacer(1, 10))

    # 5. Multi-Modal Risk Triage & Recommendations
    if triage_data:
        elements.append(Paragraph("4. Explainable Multi-Modal Risk Evaluation", section_heading))
        score = triage_data.get("risk_score", 0)
        cat = triage_data.get("risk_category", "low").upper()
        
        summary_p = Paragraph(f"<b>Composite Risk Score:</b> {score}/100 &bull; <b>Statutory Category:</b> {cat}", body_style)
        elements.append(summary_p)
        elements.append(Spacer(1, 6))

        # Factors table
        factors_table_data = [[
            Paragraph("Diagnostic Factor", table_header),
            Paragraph("Weight", table_header),
            Paragraph("Telemetry Value", table_header),
            Paragraph("Normalized", table_header),
        ]]
        for f in triage_data.get("factors", []):
            factors_table_data.append([
                Paragraph(f["name"], table_cell),
                Paragraph(f"{int(f['weight']*100)}%", table_cell),
                Paragraph(str(f["raw_value"]), table_cell),
                Paragraph(f"{f['normalized_score']:.1f}", table_cell),
            ])
        t4 = Table(factors_table_data, colWidths=[180, 70, 190, 80])
        t4.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6D5DC")),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(t4)
        elements.append(Spacer(1, 8))

        # Recommendations list
        elements.append(Paragraph("<b>Statutory Recommendations:</b>", body_style))
        for rec in triage_data.get("recommendations", []):
            elements.append(Paragraph(f"&bull; {rec}", body_style))
        elements.append(Spacer(1, 10))

    # 6. Disclaimer
    elements.append(HRFlowable(width="100%", thickness=0.5, color=TEXT_MUTED, spaceBefore=8, spaceAfter=8))
    elements.append(Paragraph(
        "<b>STATUTORY DISCLAIMER:</b> This diagnostic report is generated by PropCare NW using OpenCV optical disparity analysis, "
        "SciPy Fast Fourier Transform acoustic processing, and Open-Meteo psychrometric telemetry. "
        "Optical surface discoloration and acoustic resonances are diagnostic indicators and require physical moisture meter / surveyor validation "
        "prior to legal proceedings or structural intervention.",
        disclaimer_style,
    ))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
