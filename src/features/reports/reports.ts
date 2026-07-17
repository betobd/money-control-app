import { ReportService } from './report.service';
import { SQLiteReportRepository } from './sqlite-report.repository';

export const reportService = new ReportService(new SQLiteReportRepository());
