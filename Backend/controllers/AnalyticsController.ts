import { AuthedRequestHandler } from '../types/AuthedRequestHandler';
import { getKPIs } from '../services/analytics';
import { Parser as Json2csvParser } from 'json2csv';
import PDFDocument from 'pdfkit';

export const kpiJson: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await getKPIs(req.tenantId!);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const kpiCsv: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await getKPIs(req.tenantId!);
    const parser = new Json2csvParser();
    const csv = parser.parse([data]);
    res.header('Content-Type', 'text/csv');
    res.attachment('kpis.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const kpiXlsx: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await getKPIs(req.tenantId!);
    const xml = `<?xml version="1.0"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="KPIs"><Table><Row><Cell><Data ss:Type="String">Metric</Data></Cell><Cell><Data ss:Type="String">Value</Data></Cell></Row>${Object.entries(data)
      .map(
        ([k, v]) => `<Row><Cell><Data ss:Type="String">${k}</Data></Cell><Cell><Data ss:Type="Number">${v}</Data></Cell></Row>`
      )
      .join('')}</Table></Worksheet></Workbook>`;
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('kpis.xlsx');
    res.send(xml);
  } catch (err) {
    next(err);
  }
};

export const kpiPdf: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await getKPIs(req.tenantId!);
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=kpis.pdf');
    doc.pipe(res);
    doc.fontSize(18).text('KPIs', { align: 'center' });
    Object.entries(data).forEach(([k, v]) => {
      doc.fontSize(12).text(`${k}: ${v}`);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
};

export default {
  kpiJson,
  kpiCsv,
  kpiXlsx,
  kpiPdf,
};
