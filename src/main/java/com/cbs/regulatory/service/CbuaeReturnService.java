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
public class CbuaeReturnService {

    private final RegulatoryTemplateEngine templateEngine;

    public RegulatoryReturn generateCbuaeBalanceSheet(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.BALANCE_SHEET, reportingDate);
    }

    public RegulatoryReturn generateCbuaeAssetQuality(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.ASSET_QUALITY, reportingDate);
    }

    public RegulatoryReturn generateCbuaeLiquidity(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.LIQUIDITY, reportingDate);
    }

    public RegulatoryReturn generateCbuaeCapitalAdequacy(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.CAPITAL_ADEQUACY, reportingDate);
    }

    public RegulatoryReturn generateCbuaeConcentration(LocalDate reportingDate) {
        return generate(RegulatoryDomainEnums.ReturnType.CONCENTRATION, reportingDate);
    }

    public List<RegulatoryReturn> generateAllCbuaeReturns(LocalDate periodFrom, LocalDate periodTo) {
        LocalDate reportingDate = periodTo != null ? periodTo : periodFrom;
        return templateEngine.getTemplatesForJurisdiction(RegulatoryDomainEnums.Jurisdiction.AE_CBUAE.name()).stream()
                .map(template -> templateEngine.generateReturn(template.getTemplateCode(), reportingDate,
                        periodFrom, periodTo != null ? periodTo : reportingDate))
                .toList();
    }

    private RegulatoryReturn generate(RegulatoryDomainEnums.ReturnType returnType, LocalDate reportingDate) {
        RegulatoryReturnTemplate template = templateEngine.getActiveTemplate(
                RegulatoryDomainEnums.Jurisdiction.AE_CBUAE.name(), returnType.name());
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
