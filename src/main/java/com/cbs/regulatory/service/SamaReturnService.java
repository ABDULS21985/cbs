package com.cbs.regulatory.service;

import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class SamaReturnService {

    private final RegulatoryTemplateEngine templateEngine;

    public RegulatoryReturn generateSamaBalanceSheet(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.BALANCE_SHEET, reportingDate);
    }

    public RegulatoryReturn generateSamaFinancingPortfolio(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.FINANCING_PORTFOLIO, reportingDate);
    }

    public RegulatoryReturn generateSamaCapitalAdequacy(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.CAPITAL_ADEQUACY, reportingDate);
    }

    public RegulatoryReturn generateSamaInvestmentAccounts(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.INVESTMENT_ACCOUNTS, reportingDate);
    }

    public RegulatoryReturn generateSamaProfitDistribution(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.PROFIT_DISTRIBUTION, reportingDate);
    }

    public RegulatoryReturn generateSamaShariahCompliance(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.SHARIAH_COMPLIANCE, reportingDate);
    }

    public List<RegulatoryReturn> generateAllSamaReturns(LocalDate periodFrom, LocalDate periodTo) {
        LocalDate reportingDate = periodTo != null ? periodTo : periodFrom;
        return templateEngine.getTemplatesForJurisdiction(RegulatoryDomainEnums.Jurisdiction.SA_SAMA.name()).stream()
                .map(template -> templateEngine.generateReturn(template.getTemplateCode(), reportingDate,
                        periodFrom, periodTo != null ? periodTo : reportingDate))
                .toList();
    }

    private RegulatoryReturn generate(RegulatoryDomainEnums.ReturnType returnType, LocalDate reportingDate) {
        RegulatoryReturnTemplate template = templateEngine.getActiveTemplate(
                RegulatoryDomainEnums.Jurisdiction.SA_SAMA.name(), returnType.name());
        LocalDate effectiveDate = reportingDate != null ? reportingDate : LocalDate.now();
        return templateEngine.generateReturn(template.getTemplateCode(), effectiveDate,
                periodStart(template.getReportingFrequency(), effectiveDate), effectiveDate);
    }

    private LocalDate periodStart(RegulatoryDomainEnums.ReportingPeriodType frequency, LocalDate reportingDate) {
        return switch (frequency) {
            case MONTHLY -> reportingDate.withDayOfMonth(1);
            case QUARTERLY -> reportingDate.withMonth(((reportingDate.getMonthValue() - 1) / 3) * 3 + 1).withDayOfMonth(1);
            case SEMI_ANNUAL -> reportingDate.withMonth(reportingDate.getMonthValue() <= 6 ? 1 : 7).withDayOfMonth(1);
            case ANNUAL -> reportingDate.withDayOfYear(1);
            case AD_HOC -> reportingDate;
        };
    }
}
