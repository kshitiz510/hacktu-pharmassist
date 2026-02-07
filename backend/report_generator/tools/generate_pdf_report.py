"""
PDF Report Generator Tool
Generates comprehensive pharmaceutical intelligence reports with charts and tables
"""

# Conditional import for CrewAI tool decorator
try:
    from crewai.tools import tool
    HAS_CREWAI = True
except ImportError:
    HAS_CREWAI = False
    # Create a dummy decorator for standalone usage
    def tool(name):
        def decorator(func):
            return func
        return decorator

# Check for required PDF generation dependencies
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
        PageBreak, Image, KeepTogether
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor
    HAS_REPORTLAB = True
except ImportError as e:
    HAS_REPORTLAB = False
    REPORTLAB_ERROR = str(e)

try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-GUI backend
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    HAS_MATPLOTLIB = True
except ImportError as e:
    HAS_MATPLOTLIB = False
    MATPLOTLIB_ERROR = str(e)

from datetime import datetime
import io
import os
from typing import Dict, Any, List
import json


# Check if all required dependencies are available
def check_dependencies():
    """Check if all required dependencies are installed"""
    missing = []
    if not HAS_REPORTLAB:
        missing.append(f"reportlab - {REPORTLAB_ERROR}")
    if not HAS_MATPLOTLIB:
        missing.append(f"matplotlib - {MATPLOTLIB_ERROR}")
    
    if missing:
        error_msg = "Missing required dependencies:\n" + "\n".join(f"  - {dep}" for dep in missing)
        error_msg += "\n\nInstall with: pip install reportlab matplotlib Pillow"
        return False, error_msg
    return True, None


class PDFReportGenerator:
    """Generate professional pharmaceutical intelligence reports"""
    
    # Enhanced color scheme with gradients and modern palette
    COLORS = {
        'primary': HexColor('#1e40af'),      # Deep Blue
        'primary_light': HexColor('#3b82f6'), # Light Blue
        'secondary': HexColor('#7c3aed'),    # Deep Purple
        'secondary_light': HexColor('#a78bfa'), # Light Purple
        'accent': HexColor('#059669'),       # Deep Green
        'accent_light': HexColor('#10b981'), # Light Green
        'warning': HexColor('#d97706'),      # Deep Amber
        'warning_light': HexColor('#f59e0b'), # Light Amber
        'danger': HexColor('#dc2626'),       # Deep Red
        'danger_light': HexColor('#ef4444'), # Light Red
        'cyan': HexColor('#0891b2'),         # Deep Cyan
        'cyan_light': HexColor('#06b6d4'),   # Light Cyan
        'dark': HexColor('#18181b'),         # Dark zinc
        'light': HexColor('#f4f4f5'),        # Light zinc
        'lighter': HexColor('#fafafa'),      # Very light
        'text': HexColor('#1f2937'),         # Dark text
        'text_light': HexColor('#6b7280'),   # Gray text
        'border': HexColor('#e5e7eb'),       # Light border
    }
    
    def __init__(self, filename: str):
        self.filename = filename
        self.doc = SimpleDocTemplate(
            filename,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=1*inch,
            bottomMargin=0.75*inch
        )
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self.story = []
        self.chart_counter = 0
        
    def _setup_custom_styles(self):
        """Setup custom paragraph styles with enhanced formatting"""
        # Title style with shadow effect
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=28,
            textColor=self.COLORS['primary'],
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            leading=34
        ))
        
        # Section header with bottom border
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=18,
            textColor=self.COLORS['primary'],
            spaceAfter=16,
            spaceBefore=24,
            fontName='Helvetica-Bold',
            borderWidth=2,
            borderColor=self.COLORS['primary_light'],
            borderPadding=8,
            leftIndent=0,
            backColor=self.COLORS['lighter']
        ))
        
        # Subsection header with accent
        self.styles.add(ParagraphStyle(
            name='SubsectionHeader',
            parent=self.styles['Heading3'],
            fontSize=14,
            textColor=self.COLORS['secondary'],
            spaceAfter=10,
            spaceBefore=14,
            fontName='Helvetica-Bold',
            leftIndent=10,
            borderWidth=0,
            borderPadding=4,
            backColor=HexColor('#f3f4f6')
        ))
        
        # Body text with better readability
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['BodyText'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=10,
            leading=16,
            textColor=self.COLORS['text'],
            wordWrap='CJK'  # Enable word wrapping
        ))
        
        # Bullet points with better formatting
        self.styles.add(ParagraphStyle(
            name='CustomBullet',
            parent=self.styles['BodyText'],
            fontSize=10,
            leftIndent=24,
            rightIndent=20,  # Add right margin
            spaceAfter=8,
            bulletIndent=12,
            leading=15,
            textColor=self.COLORS['text'],
            wordWrap='CJK',  # Enable word wrapping
            alignment=TA_LEFT  # Left align for better wrapping
        ))
        
        # Highlight box style
        self.styles.add(ParagraphStyle(
            name='HighlightBox',
            parent=self.styles['BodyText'],
            fontSize=11,
            backColor=self.COLORS['lighter'],
            borderWidth=1,
            borderColor=self.COLORS['border'],
            borderPadding=12,
            spaceAfter=12,
            leading=16
        ))
        
        # Key insight style
        self.styles.add(ParagraphStyle(
            name='KeyInsight',
            parent=self.styles['BodyText'],
            fontSize=10,
            leftIndent=16,
            rightIndent=16,
            backColor=HexColor('#eff6ff'),
            borderWidth=2,
            borderColor=self.COLORS['primary_light'],
            borderPadding=10,
            spaceAfter=10,
            leading=14,
            wordWrap='CJK'  # Enable word wrapping
        ))
        
    def add_cover_page(self, drug_name: str, indication: str, date: str = None):
        """Add enhanced cover page with better visual design"""
        if date is None:
            date = datetime.now().strftime("%B %d, %Y")
            
        self.story.append(Spacer(1, 1.5*inch))
        
        # Decorative top line
        line_style = [
            ('LINEBELOW', (0, 0), (-1, 0), 3, self.COLORS['primary']),
            ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['lighter'])
        ]
        top_line = Table([['  ']], colWidths=[6.5*inch])
        top_line.setStyle(TableStyle(line_style))
        self.story.append(top_line)
        self.story.append(Spacer(1, 0.4*inch))
        
        # Title with gradient effect
        title = Paragraph(
            f"<b>PHARMACEUTICAL</b><br/><b>INTELLIGENCE REPORT</b>",
            ParagraphStyle(
                name='CoverTitle',
                fontSize=30,
                textColor=self.COLORS['primary'],
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                leading=36,
                spaceAfter=0
            )
        )
        self.story.append(title)
        self.story.append(Spacer(1, 0.5*inch))
        
        # Drug name in colored box
        drug_box_data = [[Paragraph(
            f"<b>{drug_name.upper()}</b>",
            ParagraphStyle(
                name='DrugTitle',
                fontSize=24,
                textColor=colors.white,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            )
        )]]
        drug_box = Table(drug_box_data, colWidths=[5*inch])
        drug_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.COLORS['secondary']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 16),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
            ('LEFTPADDING', (0, 0), (-1, -1), 20),
            ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ]))
        self.story.append(drug_box)
        self.story.append(Spacer(1, 0.3*inch))
        
        # Indication with icon
        indication_text = Paragraph(
            f"<font color='#{self.COLORS['accent'].hexval()[2:]}'><b>◆</b></font> <i>{indication.upper() if indication != 'general' else 'COMPREHENSIVE ANALYSIS'}</i>",
            ParagraphStyle(
                name='Indication',
                fontSize=16,
                textColor=self.COLORS['text'],
                alignment=TA_CENTER,
                fontName='Helvetica-Oblique',
                spaceAfter=0
            )
        )
        self.story.append(indication_text)
        self.story.append(Spacer(1, 1.2*inch))
        
        # Info box with date and platform
        info_data = [
            [Paragraph(f"<b>Report Date:</b> {date}", 
                      ParagraphStyle(name='InfoText', fontSize=11, alignment=TA_CENTER))],
            [Paragraph("<b>Generated by:</b> PharmAssist Intelligence Platform", 
                      ParagraphStyle(name='InfoText2', fontSize=11, alignment=TA_CENTER))],
            [Paragraph("<b>Multi-Agent Analysis System</b>", 
                      ParagraphStyle(name='InfoText3', fontSize=10, alignment=TA_CENTER, textColor=self.COLORS['text_light']))]
        ]
        info_box = Table(info_data, colWidths=[5*inch])
        info_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.COLORS['lighter']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 1, self.COLORS['border']),
        ]))
        self.story.append(info_box)
        
        # Decorative bottom line
        self.story.append(Spacer(1, 0.3*inch))
        bottom_line = Table([['  ']], colWidths=[6.5*inch])
        bottom_line.setStyle(TableStyle(line_style))
        self.story.append(bottom_line)
        
        self.story.append(PageBreak())
        
    def add_executive_summary(self, summary_data: Dict[str, Any]):
        """Add executive summary section"""
        self.story.append(Paragraph("Executive Summary", self.styles['SectionHeader']))
        self.story.append(Spacer(1, 0.2*inch))
        
        if isinstance(summary_data, dict) and 'sections' in summary_data:
            for section in summary_data.get('sections', []):
                bullet = Paragraph(
                    f"• <b>{section.get('title', 'Section')}:</b> {section.get('description', 'N/A')}",
                    self.styles['CustomBullet']
                )
                self.story.append(bullet)
                self.story.append(Spacer(1, 0.05*inch))
        
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_market_analysis(self, iqvia_data: Dict[str, Any], indication: str):
        """Add IQVIA market analysis section with charts"""
        self.story.append(Paragraph("Market Analysis", self.styles['SectionHeader']))
        self.story.append(Spacer(1, 0.15*inch))
        
        if indication == "general":
            # Market forecast chart
            if 'market_forecast' in iqvia_data:
                forecast = iqvia_data['market_forecast']
                self.story.append(Paragraph(
                    forecast.get('title', 'Market Forecast'),
                    self.styles['SubsectionHeader']
                ))
                
                # Create chart
                chart_img = self._create_market_forecast_chart(forecast.get('data', []))
                if chart_img:
                    self.story.append(chart_img)
                
                # Description
                if 'description' in forecast:
                    self.story.append(Spacer(1, 0.1*inch))
                    self.story.append(Paragraph(
                        forecast['description'],
                        self.styles['CustomBody']
                    ))
                
                self.story.append(Spacer(1, 0.2*inch))
            
            # Competitive share
            if 'competitive_share' in iqvia_data:
                comp_share = iqvia_data['competitive_share']
                self.story.append(Paragraph(
                    comp_share.get('title', 'Competitive Share'),
                    self.styles['SubsectionHeader']
                ))
                
                # Create table
                if 'data' in comp_share:
                    table_data = [['Company', 'Market Share']]
                    for item in comp_share['data']:
                        table_data.append([
                            item.get('company', ''),
                            item.get('share', '')
                        ])
                    
                    table = Table(table_data, colWidths=[3.5*inch, 2*inch])
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['primary']),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 11),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('TEXTCOLOR', (0, 1), (-1, -1), self.COLORS['text']),
                        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 1), (-1, -1), 10),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['light']]),
                    ]))
                    self.story.append(table)
                
                if 'description' in comp_share:
                    self.story.append(Spacer(1, 0.1*inch))
                    self.story.append(Paragraph(
                        comp_share['description'],
                        self.styles['CustomBody']
                    ))
        else:
            # AUD-specific market data
            if 'market_overview' in iqvia_data:
                overview = iqvia_data['market_overview']
                self.story.append(Paragraph(
                    overview.get('title', 'Market Overview'),
                    self.styles['SubsectionHeader']
                ))
                
                if 'metrics' in overview:
                    table_data = [['Metric', 'Value']]
                    for metric in overview['metrics']:
                        table_data.append([
                            metric.get('label', ''),
                            metric.get('value', '')
                        ])
                    
                    table = Table(table_data, colWidths=[3.5*inch, 2*inch])
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['accent']),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 11),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('TEXTCOLOR', (0, 1), (-1, -1), self.COLORS['text']),
                        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 1), (-1, -1), 10),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['light']]),
                    ]))
                    self.story.append(table)
                    self.story.append(Spacer(1, 0.2*inch))
            
            # Existing therapies
            if 'existing_therapies' in iqvia_data:
                therapies = iqvia_data['existing_therapies']
                self.story.append(Paragraph(
                    therapies.get('title', 'Existing Therapies'),
                    self.styles['SubsectionHeader']
                ))
                
                if 'data' in therapies:
                    table_data = [['Drug', 'Mechanism', 'Efficacy', 'Limitations']]
                    for therapy in therapies['data']:
                        table_data.append([
                            therapy.get('drug', ''),
                            therapy.get('mechanism', ''),
                            therapy.get('efficacy', ''),
                            therapy.get('limitations', '')
                        ])
                    
                    table = Table(table_data, colWidths=[1.3*inch, 1.8*inch, 1*inch, 2.4*inch])
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['secondary']),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('TEXTCOLOR', (0, 1), (-1, -1), self.COLORS['text']),
                        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 1), (-1, -1), 9),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['light']]),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
                    self.story.append(table)
        
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_clinical_analysis(self, clinical_data: Dict[str, Any], indication: str):
        """Add clinical trials analysis section"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("Clinical Evidence", self.styles['SectionHeader']))
        self.story.append(Spacer(1, 0.15*inch))
        
        if indication == "general":
            # Phase distribution
            if 'phase_distribution' in clinical_data:
                phase_dist = clinical_data['phase_distribution']
                self.story.append(Paragraph(
                    phase_dist.get('title', 'Phase Distribution'),
                    self.styles['SubsectionHeader']
                ))
                
                # Create pie chart
                chart_img = self._create_phase_distribution_chart(phase_dist.get('data', []))
                if chart_img:
                    self.story.append(chart_img)
                
                if 'description' in phase_dist:
                    self.story.append(Spacer(1, 0.1*inch))
                    self.story.append(Paragraph(
                        phase_dist['description'],
                        self.styles['CustomBody']
                    ))
                
                self.story.append(Spacer(1, 0.2*inch))
            
            # Sponsor profile
            if 'sponsor_profile' in clinical_data:
                sponsor = clinical_data['sponsor_profile']
                self.story.append(Paragraph(
                    sponsor.get('title', 'Sponsor Profile'),
                    self.styles['SubsectionHeader']
                ))
                
                if 'data' in sponsor:
                    table_data = [['Sponsor', 'Trial Count', 'Primary Focus']]
                    for item in sponsor['data']:
                        table_data.append([
                            item.get('sponsor', ''),
                            f"~{item.get('trial_count', '')}",
                            item.get('focus', '')
                        ])
                    
                    table = Table(table_data, colWidths=[2.5*inch, 1.5*inch, 2.5*inch])
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['accent']),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 11),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('TEXTCOLOR', (0, 1), (-1, -1), self.COLORS['text']),
                        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 1), (-1, -1), 10),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['light']]),
                    ]))
                    self.story.append(table)
        else:
            # AUD-specific clinical data
            if 'key_trials' in clinical_data:
                trials = clinical_data['key_trials']
                self.story.append(Paragraph(
                    trials.get('title', 'Key Trials'),
                    self.styles['SubsectionHeader']
                ))
                
                if 'data' in trials:
                    table_data = [['Trial ID', 'Phase', 'Primary Endpoints', 'Sponsor']]
                    for trial in trials['data']:
                        table_data.append([
                            trial.get('trial_id', ''),
                            trial.get('phase', ''),
                            trial.get('primary_endpoints', ''),
                            trial.get('sponsor', '')
                        ])
                    
                    table = Table(table_data, colWidths=[1.2*inch, 0.8*inch, 2.8*inch, 1.7*inch])
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['accent']),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 9),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('TEXTCOLOR', (0, 1), (-1, -1), self.COLORS['text']),
                        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 1), (-1, -1), 8),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['light']]),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
                    self.story.append(table)
                    
                    if 'description' in trials:
                        self.story.append(Spacer(1, 0.1*inch))
                        self.story.append(Paragraph(
                            trials['description'],
                            self.styles['CustomBody']
                        ))
        
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_patent_analysis(self, patent_data: Dict[str, Any], indication: str):
        """Add patent landscape analysis"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("Patent Landscape", self.styles['SectionHeader']))
        self.story.append(Spacer(1, 0.15*inch))
        
        if indication == "general":
            # Landscape overview
            if 'landscape_overview' in patent_data:
                overview = patent_data['landscape_overview']
                self.story.append(Paragraph(
                    overview.get('title', 'Landscape Overview'),
                    self.styles['SubsectionHeader']
                ))
                
                if 'sections' in overview:
                    for section in overview['sections']:
                        bullet = Paragraph(
                            f"• <b>{section.get('label', '')}:</b> {section.get('value', '')}",
                            self.styles['CustomBullet']
                        )
                        self.story.append(bullet)
                
                if 'description' in overview:
                    self.story.append(Spacer(1, 0.1*inch))
                    self.story.append(Paragraph(
                        overview['description'],
                        self.styles['CustomBody']
                    ))
                
                self.story.append(Spacer(1, 0.2*inch))
            
            # Filing heatmap
            if 'filing_heatmap' in patent_data:
                heatmap = patent_data['filing_heatmap']
                self.story.append(Paragraph(
                    heatmap.get('title', 'Filing Activity'),
                    self.styles['SubsectionHeader']
                ))
                
                if 'data' in heatmap:
                    table_data = [['Region', 'Filing Count']]
                    for item in heatmap['data']:
                        table_data.append([
                            item.get('region', ''),
                            str(item.get('count', ''))
                        ])
                    
                    table = Table(table_data, colWidths=[3.5*inch, 2*inch])
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['warning']),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 11),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('TEXTCOLOR', (0, 1), (-1, -1), self.COLORS['text']),
                        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 1), (-1, -1), 10),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['light']]),
                    ]))
                    self.story.append(table)
        else:
            # AUD-specific patent data
            if 'aud_focus' in patent_data:
                aud_focus = patent_data['aud_focus']
                self.story.append(Paragraph(
                    aud_focus.get('title', 'AUD Patent Focus'),
                    self.styles['SubsectionHeader']
                ))
                
                if 'sections' in aud_focus:
                    for section in aud_focus['sections']:
                        bullet = Paragraph(
                            f"• <b>{section.get('label', '')}:</b> {section.get('value', '')}",
                            self.styles['CustomBullet']
                        )
                        self.story.append(bullet)
                
                if 'description' in aud_focus:
                    self.story.append(Spacer(1, 0.1*inch))
                    self.story.append(Paragraph(
                        aud_focus['description'],
                        self.styles['CustomBody']
                    ))
        
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_exim_analysis(self, exim_data: Dict[str, Any]):
        """Add EXIM trade analysis"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("Export-Import Trade Analysis", self.styles['SectionHeader']))
        self.story.append(Spacer(1, 0.15*inch))
        
        # Trade volume
        if 'trade_volume' in exim_data:
            trade = exim_data['trade_volume']
            self.story.append(Paragraph(
                trade.get('title', 'Trade Volume'),
                self.styles['SubsectionHeader']
            ))
            
            if 'data' in trade:
                table_data = [['Source Country', 'Q2 2024 (kg)', 'Q3 2024 (kg)', 'QoQ Growth']]
                for item in trade['data']:
                    table_data.append([
                        item.get('country', ''),
                        item.get('q2_2024', ''),
                        item.get('q3_2024', ''),
                        item.get('qoq_growth', '')
                    ])
                
                table = Table(table_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1.5*inch])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['cyan']),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('TEXTCOLOR', (0, 1), (-1, -1), self.COLORS['text']),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['light']]),
                ]))
                self.story.append(table)
            
            if 'description' in trade:
                self.story.append(Spacer(1, 0.1*inch))
                self.story.append(Paragraph(
                    trade['description'],
                    self.styles['CustomBody']
                ))
            
            self.story.append(Spacer(1, 0.2*inch))
        
        # Import dependency
        if 'import_dependency' in exim_data:
            dependency = exim_data['import_dependency']
            self.story.append(Paragraph(
                dependency.get('title', 'Import Dependency'),
                self.styles['SubsectionHeader']
            ))
            
            if 'data' in dependency:
                table_data = [['Region', 'Dependency %', 'Primary Sources', 'Risk Level']]
                for item in dependency['data']:
                    table_data.append([
                        item.get('region', ''),
                        item.get('dependency_percent', ''),
                        item.get('primary_sources', ''),
                        item.get('risk_level', '')
                    ])
                
                table = Table(table_data, colWidths=[1.5*inch, 1.2*inch, 2.3*inch, 1.5*inch])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['warning']),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                    ('ALIGN', (3, 0), (3, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('TEXTCOLOR', (0, 1), (-1, -1), self.COLORS['text']),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['light']]),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                self.story.append(table)
        
        self.story.append(Spacer(1, 0.3*inch))
        
    def add_internal_knowledge(self, internal_data: Dict[str, Any]):
        """Add internal knowledge insights with enhanced formatting"""
        self.story.append(PageBreak())
        self.story.append(Paragraph("Strategic Insights", self.styles['SectionHeader']))
        self.story.append(Spacer(1, 0.2*inch))
        
        # Strategic synthesis section
        if 'strategic_synthesis' in internal_data:
            synthesis = internal_data['strategic_synthesis']
            self.story.append(Paragraph(
                synthesis.get('title', 'Strategic Synthesis'),
                self.styles['SubsectionHeader']
            ))
            
            if 'insights' in synthesis:
                for insight in synthesis['insights']:
                    # Create highlighted box for each insight
                    insight_text = Paragraph(
                        f"<b>{insight.get('label', '')}:</b><br/>{insight.get('value', '')}",
                        self.styles['KeyInsight']
                    )
                    self.story.append(insight_text)
                    self.story.append(Spacer(1, 0.05*inch))
            
            if 'description' in synthesis:
                self.story.append(Spacer(1, 0.1*inch))
                self.story.append(Paragraph(
                    synthesis['description'],
                    self.styles['CustomBody']
                ))
            
            self.story.append(Spacer(1, 0.3*inch))
        
        # Cross-indication comparison section
        if 'cross_indication_comparison' in internal_data:
            comparison = internal_data['cross_indication_comparison']
            self.story.append(Paragraph(
                comparison.get('title', 'Cross-Indication Comparison'),
                self.styles['SubsectionHeader']
            ))
            self.story.append(Spacer(1, 0.1*inch))
            
            if 'dimensions' in comparison:
                # Create comparison table
                table_data = [['Dimension', 'Diabetes/Obesity', 'Emerging CNS']]
                for dim in comparison['dimensions']:
                    table_data.append([
                        dim.get('dimension', ''),
                        dim.get('diabetes_obesity', ''),
                        dim.get('emerging_cns', '')
                    ])
                
                table = Table(table_data, colWidths=[2*inch, 2.2*inch, 2.2*inch])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), self.COLORS['secondary']),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 11),
                    ('TOPPADDING', (0, 0), (-1, 0), 14),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 14),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('TEXTCOLOR', (0, 1), (-1, -1), self.COLORS['text']),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 10),
                    ('GRID', (0, 0), (-1, -1), 1, self.COLORS['border']),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.COLORS['lighter']]),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING', (0, 1), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
                ]))
                self.story.append(table)
            
            if 'description' in comparison:
                self.story.append(Spacer(1, 0.15*inch))
                self.story.append(Paragraph(
                    comparison['description'],
                    self.styles['CustomBody']
                ))
        
        # AUD-specific focus section
        if 'aud_focus' in internal_data:
            aud = internal_data['aud_focus']
            self.story.append(Spacer(1, 0.3*inch))
            self.story.append(Paragraph(
                aud.get('title', 'AUD Focus'),
                self.styles['SubsectionHeader']
            ))
            
            if 'insights' in aud:
                for insight in aud['insights']:
                    insight_text = Paragraph(
                        f"<b>{insight.get('label', '')}:</b><br/>{insight.get('value', '')}",
                        self.styles['KeyInsight']
                    )
                    self.story.append(insight_text)
                    self.story.append(Spacer(1, 0.05*inch))
        
        self.story.append(Spacer(1, 0.3*inch))
        
    def _create_market_forecast_chart(self, data: List[Dict]) -> Image:
        """Create enhanced market forecast line chart with better styling"""
        if not data:
            return None
            
        # Set style
        plt.style.use('seaborn-v0_8-darkgrid')
        fig, ax = plt.subplots(figsize=(7, 4), facecolor='white')
        
        years = [item['year'] for item in data]
        values = [item['value'] for item in data]
        
        # Create gradient effect with multiple fills
        ax.plot(years, values, marker='o', linewidth=3.5, 
                color='#1e40af', markersize=10, markerfacecolor='#3b82f6',
                markeredgecolor='#1e40af', markeredgewidth=2, 
                label='Market Size', zorder=3)
        
        # Add value labels on points
        for i, (year, value) in enumerate(zip(years, values)):
            ax.text(year, value, f'${value}B', 
                   ha='center', va='bottom', fontsize=9, 
                   fontweight='bold', color='#1e40af')
        
        # Fill area with gradient
        ax.fill_between(years, values, alpha=0.3, color='#3b82f6', zorder=2)
        ax.fill_between(years, values, alpha=0.15, color='#60a5fa', zorder=1)
        
        # Styling
        ax.set_xlabel('Year', fontsize=11, fontweight='bold', color='#374151')
        ax.set_ylabel('Market Size (USD Billions)', fontsize=11, fontweight='bold', color='#374151')
        ax.set_title('GLP-1 Market Forecast & Growth Trajectory', 
                    fontsize=13, fontweight='bold', pad=20, color='#1f2937')
        ax.grid(True, alpha=0.3, linestyle='--', linewidth=0.8)
        ax.set_facecolor('#f9fafb')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#d1d5db')
        ax.spines['bottom'].set_color('#d1d5db')
        ax.legend(loc='upper left', framealpha=0.9, fontsize=10)
        
        plt.tight_layout()
        
        # Save to buffer
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', dpi=200, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        img_buffer.seek(0)
        plt.close()
        
        # Create ReportLab Image
        img = Image(img_buffer, width=6*inch, height=3.5*inch)
        return img
        
    def _create_phase_distribution_chart(self, data: List[Dict]) -> Image:
        """Create enhanced phase distribution pie chart with better visuals"""
        if not data:
            return None
            
        fig, ax = plt.subplots(figsize=(7, 5), facecolor='white')
        
        phases = [item['phase'] for item in data]
        counts = [int(item['count']) for item in data]
        
        # Enhanced color palette with gradients
        colors_map = {
            'Phase I': '#3b82f6',    # Blue
            'Phase II': '#10b981',   # Green
            'Phase III': '#f59e0b',  # Amber
            'Phase IV': '#8b5cf6'    # Purple
        }
        colors_list = [colors_map.get(phase, '#6b7280') for phase in phases]
        
        # Create explode effect for emphasis
        explode = [0.05] * len(phases)
        
        # Create pie chart with enhanced styling
        wedges, texts, autotexts = ax.pie(
            counts, 
            labels=phases, 
            autopct='%1.1f%%',
            colors=colors_list,
            startangle=90,
            textprops={'fontsize': 11, 'fontweight': 'bold', 'color': '#1f2937'},
            explode=explode,
            shadow=True,
            wedgeprops={'edgecolor': 'white', 'linewidth': 2, 'antialiased': True}
        )
        
        # Style percentage labels
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontsize(10)
            autotext.set_fontweight('bold')
        
        # Add legend with counts
        legend_labels = [f'{phase}: {count} trials' for phase, count in zip(phases, counts)]
        ax.legend(legend_labels, loc='center left', bbox_to_anchor=(1, 0, 0.5, 1),
                 framealpha=0.9, fontsize=9)
        
        ax.set_title('Clinical Trial Phase Distribution', 
                    fontsize=14, fontweight='bold', pad=20, color='#1f2937')
        
        plt.tight_layout()
        
        # Save to buffer
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', dpi=200, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        img_buffer.seek(0)
        plt.close()
        
        # Create ReportLab Image
        img = Image(img_buffer, width=6*inch, height=4*inch)
        return img
        
    def build(self):
        """Build the PDF document"""
        self.doc.build(self.story)


# Core PDF generation function (not decorated, always callable)
def _generate_pdf_core(
    drug_name: str,
    indication: str,
    iqvia_data: dict,
    exim_data: dict,
    patent_data: dict,
    clinical_data: dict,
    internal_knowledge_data: dict,
    report_data: dict
) -> dict:
    """
    Core PDF generation logic.
    This function is always callable regardless of CrewAI installation.
    
    Args:
        drug_name: Name of the drug
        indication: Indication type ("general" or "aud")
        iqvia_data: Market data from IQVIA agent
        exim_data: Trade data from EXIM agent
        patent_data: Patent landscape from Patent agent
        clinical_data: Clinical trials data from Clinical agent
        internal_knowledge_data: Strategic insights from Internal Knowledge agent
        report_data: Report metadata
    
    Returns:
        Dictionary with PDF generation status and file path
    """
    # Check if required dependencies are available
    deps_ok, error_msg = check_dependencies()
    if not deps_ok:
        return {
            "status": "error",
            "message": "Missing required dependencies for PDF generation",
            "error": error_msg
        }
    
    try:
        # Create output directory if it doesn't exist
        output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "generated_reports")
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.join(
            output_dir, 
            f"{drug_name.replace(' ', '_')}_{indication}_{timestamp}.pdf"
        )
        
        # Create PDF generator
        pdf = PDFReportGenerator(filename)
        
        # Add cover page
        indication_display = "Alcohol Use Disorder (AUD) Analysis" if indication == "aud" else "Comprehensive Drug Repurposing Analysis"
        pdf.add_cover_page(drug_name, indication_display)
        
        # Add executive summary
        pdf.add_executive_summary(report_data)
        
        # Add market analysis
        pdf.add_market_analysis(iqvia_data, indication)
        
        # Add clinical analysis
        pdf.add_clinical_analysis(clinical_data, indication)
        
        # Add patent analysis
        pdf.add_patent_analysis(patent_data, indication)
        
        # Add EXIM analysis (only for first prompt)
        if indication == "general" and exim_data:
            pdf.add_exim_analysis(exim_data)
        
        # Add internal knowledge
        pdf.add_internal_knowledge(internal_knowledge_data)
        
        # Build the PDF
        pdf.build()
        
        return {
            "status": "success",
            "message": f"PDF report generated successfully",
            "file_path": filename,
            "file_name": os.path.basename(filename),
            "drug_name": drug_name,
            "indication": indication,
            "timestamp": timestamp
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to generate PDF: {str(e)}",
            "error": str(e)
        }


# CrewAI tool wrapper (only used when CrewAI calls it)
@tool("generate_pdf_report")
def generate_pdf_report(
    drug_name: str,
    indication: str,
    iqvia_data: dict,
    exim_data: dict,
    patent_data: dict,
    clinical_data: dict,
    internal_knowledge_data: dict,
    report_data: dict
) -> dict:
    """
    Generate a comprehensive PDF report with all agent data.
    
    This is the CrewAI tool wrapper. For standalone usage, use create_pdf_report() instead.
    
    Args:
        drug_name: Name of the drug
        indication: Indication type ("general" or "aud")
        iqvia_data: Market data from IQVIA agent
        exim_data: Trade data from EXIM agent
        patent_data: Patent landscape from Patent agent
        clinical_data: Clinical trials data from Clinical agent
        internal_knowledge_data: Strategic insights from Internal Knowledge agent
        report_data: Report metadata
    
    Returns:
        Dictionary with PDF generation status and file path
    """
    # Check if required dependencies are available
    deps_ok, error_msg = check_dependencies()
    if not deps_ok:
        return {
            "status": "error",
            "message": "Missing required dependencies for PDF generation",
            "error": error_msg
        }
    
    try:
        # Create output directory if it doesn't exist
        output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "generated_reports")
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.join(
            output_dir, 
            f"{drug_name.replace(' ', '_')}_{indication}_{timestamp}.pdf"
        )
        
        # Create PDF generator
        pdf = PDFReportGenerator(filename)
        
        # Add cover page
        indication_display = "Alcohol Use Disorder (AUD) Analysis" if indication == "aud" else "Comprehensive Drug Repurposing Analysis"
        pdf.add_cover_page(drug_name, indication_display)
        
        # Add executive summary
        pdf.add_executive_summary(report_data)
        
        # Add market analysis
        pdf.add_market_analysis(iqvia_data, indication)
        
        # Add clinical analysis
        pdf.add_clinical_analysis(clinical_data, indication)
        
        # Add patent analysis
        pdf.add_patent_analysis(patent_data, indication)
        
        # Add EXIM analysis (only for first prompt)
        if indication == "general" and exim_data:
            pdf.add_exim_analysis(exim_data)
        
        # Add internal knowledge
        pdf.add_internal_knowledge(internal_knowledge_data)
        
        # Build the PDF
        pdf.build()
        
        return {
            "status": "success",
            "message": f"PDF report generated successfully",
            "file_path": filename,
            "file_name": os.path.basename(filename),
            "drug_name": drug_name,
            "indication": indication,
            "timestamp": timestamp
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to generate PDF: {str(e)}",
            "error": str(e)
        }


# Standalone function for direct usage (without CrewAI tool wrapper)
def create_pdf_report(**kwargs):
    """
    Standalone function to generate PDF report without CrewAI dependency.
    This always works regardless of CrewAI installation.
    
    Usage:
        result = create_pdf_report(
            drug_name="semaglutide",
            indication="general",
            iqvia_data={...},
            exim_data={...},
            patent_data={...},
            clinical_data={...},
            internal_knowledge_data={...},
            report_data={...}
        )
    
    Returns:
        Dictionary with PDF generation status and file path
    """
    # Call the core function directly (bypasses the Tool wrapper)
    return _generate_pdf_core(**kwargs)
