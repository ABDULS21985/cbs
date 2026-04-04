package com.cbs.rulesengine;

import com.cbs.AbstractIntegrationTest;
import com.cbs.common.exception.BusinessException;
import com.cbs.rulesengine.dto.*;
import com.cbs.rulesengine.entity.BusinessRuleCategory;
import com.cbs.rulesengine.entity.BusinessRuleType;
import com.cbs.rulesengine.entity.RuleSeverity;
import com.cbs.rulesengine.service.BusinessRuleService;
import com.cbs.rulesengine.service.DecisionTableService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BusinessRuleIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private BusinessRuleService businessRuleService;

    @Autowired
    private DecisionTableService decisionTableService;

    @Test
    void createAndActivateRuleBuildsVersionChain() {
        BusinessRuleResponse created = businessRuleService.createRule(CreateBusinessRuleRequest.builder()
                .ruleCode("TEST_RULE_" + System.currentTimeMillis())
                .name("Test Rule")
                .category(BusinessRuleCategory.SHARIAH_COMPLIANCE)
                .subCategory("General Shariah")
                .ruleType(BusinessRuleType.CONSTRAINT)
                .severity(RuleSeverity.BLOCKING)
                .evaluationExpression("transaction.amount > 0")
                .effectiveFrom(LocalDate.now())
                .priority(1)
                .build());

        assertThat(created.getStatus().name()).isEqualTo("DRAFT");
        assertThat(created.getCurrentVersion()).isEqualTo(1);

        BusinessRuleResponse activated = businessRuleService.activateRule(created.getId());

        assertThat(activated.getStatus().name()).isEqualTo("ACTIVE");
        assertThat(activated.getApprovedBy()).isNotBlank();
        assertThat(activated.getCurrentVersion()).isEqualTo(2);
        assertThat(businessRuleService.getRuleVersions(created.getId())).hasSize(2);
    }

    @Test
    void activeRuleCannotBeDirectlyUpdated() {
        BusinessRuleResponse created = businessRuleService.createRule(CreateBusinessRuleRequest.builder()
                .ruleCode("ACTIVE_RULE_" + System.currentTimeMillis())
                .name("Active Rule")
                .category(BusinessRuleCategory.SHARIAH_COMPLIANCE)
                .subCategory("General Shariah")
                .ruleType(BusinessRuleType.CONSTRAINT)
                .severity(RuleSeverity.BLOCKING)
                .evaluationExpression("transaction.amount > 0")
                .effectiveFrom(LocalDate.now())
                .priority(1)
                .build());
        businessRuleService.activateRule(created.getId());

        assertThatThrownBy(() -> businessRuleService.updateRule(created.getId(), UpdateBusinessRuleRequest.builder()
                .name("Updated")
                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only DRAFT and SUSPENDED rules can be updated");
    }

    @Test
    void getActiveRulesForProductReturnsOnlyMatchingEffectiveRules() {
        String suffix = String.valueOf(System.currentTimeMillis());

        BusinessRuleResponse murabahaRule = businessRuleService.activateRule(
                businessRuleService.createRule(CreateBusinessRuleRequest.builder()
                        .ruleCode("MURABAHA_RULE_" + suffix)
                        .name("Murabaha Rule")
                        .category(BusinessRuleCategory.SHARIAH_COMPLIANCE)
                        .subCategory("Murabaha Rules")
                        .ruleType(BusinessRuleType.CONSTRAINT)
                        .severity(RuleSeverity.BLOCKING)
                        .evaluationExpression("contract.currentMarkupRate == contract.signedMarkupRate")
                        .applicableProducts(List.of("MURABAHA"))
                        .effectiveFrom(LocalDate.now())
                        .priority(1)
                        .build()).getId());

        businessRuleService.activateRule(
                businessRuleService.createRule(CreateBusinessRuleRequest.builder()
                        .ruleCode("FUTURE_RULE_" + suffix)
                        .name("Future Murabaha Rule")
                        .category(BusinessRuleCategory.SHARIAH_COMPLIANCE)
                        .subCategory("Murabaha Rules")
                        .ruleType(BusinessRuleType.CONSTRAINT)
                        .severity(RuleSeverity.BLOCKING)
                        .evaluationExpression("contract.currentMarkupRate == contract.signedMarkupRate")
                        .applicableProducts(List.of("MURABAHA"))
                        .effectiveFrom(LocalDate.now().plusDays(10))
                        .priority(2)
                        .build()).getId());

        businessRuleService.activateRule(
                businessRuleService.createRule(CreateBusinessRuleRequest.builder()
                        .ruleCode("IJARA_RULE_" + suffix)
                        .name("Ijara Rule")
                        .category(BusinessRuleCategory.SHARIAH_COMPLIANCE)
                        .subCategory("Ijara Rules")
                        .ruleType(BusinessRuleType.CONSTRAINT)
                        .severity(RuleSeverity.BLOCKING)
                        .evaluationExpression("asset.ownershipTransferDate <= contract.saleDate")
                        .applicableProducts(List.of("IJARA"))
                        .effectiveFrom(LocalDate.now())
                        .priority(3)
                        .build()).getId());

        List<BusinessRuleResponse> rules = businessRuleService.getActiveRulesForProduct("MURABAHA");

        assertThat(rules).extracting(BusinessRuleResponse::getId).contains(murabahaRule.getId());
        assertThat(rules).extracting(BusinessRuleResponse::getRuleCode)
                .doesNotContain("IJARA_RULE_" + suffix, "FUTURE_RULE_" + suffix);
    }

    @Test
    void decisionTableChangesAreCapturedInVersionSnapshots() {
        BusinessRuleResponse rule = businessRuleService.createRule(CreateBusinessRuleRequest.builder()
                .ruleCode("TABLE_RULE_" + System.currentTimeMillis())
                .name("Table Rule")
                .category(BusinessRuleCategory.PRICING)
                .subCategory("Murabaha Rules")
                .ruleType(BusinessRuleType.CALCULATION)
                .severity(RuleSeverity.INFORMATIONAL)
                .evaluationExpression("decisionTable(\"TABLE\")")
                .applicableProducts(List.of("MURABAHA"))
                .effectiveFrom(LocalDate.now())
                .priority(10)
                .build());

        DecisionTableResponse table = decisionTableService.createDecisionTable(rule.getId(), CreateDecisionTableRequest.builder()
                .tableName("Murabaha Table " + rule.getId())
                .description("Versioned table")
                .inputColumns(List.of(
                        Map.of("name", "customerSegment", "type", "STRING"),
                        Map.of("name", "financingAmount", "type", "DECIMAL_RANGE")
                ))
                .outputColumns(List.of(
                        Map.of("name", "profitRate", "type", "DECIMAL")
                ))
                .hitPolicy(com.cbs.rulesengine.entity.DecisionTableHitPolicy.FIRST_MATCH)
                .status(com.cbs.rulesengine.entity.BusinessRuleStatus.ACTIVE)
                .build());

        decisionTableService.addRow(table.getId(), DecisionTableRowRequest.builder()
                .rowNumber(1)
                .inputValues(List.of(
                        Map.of("value", "RETAIL"),
                        Map.of("from", 0, "to", 500000)
                ))
                .outputValues(List.of(Map.of("value", 5.5)))
                .priority(1)
                .build());

        List<BusinessRuleVersionSummary> versions = businessRuleService.getRuleVersions(rule.getId());
        BusinessRuleVersionResponse latest = businessRuleService.getRuleVersion(rule.getId(), versions.getFirst().getVersionNumber());

        assertThat(versions).hasSizeGreaterThanOrEqualTo(3);
        assertThat(latest.getDecisionTableSnapshot()).isNotEmpty();
        assertThat(latest.getDecisionTableSnapshot().getFirst()).containsEntry("tableName", "Murabaha Table " + rule.getId());
    }

    @Test
    void getRuleAsOfReturnsHistoricalSnapshot() {
        BusinessRuleResponse created = businessRuleService.createRule(CreateBusinessRuleRequest.builder()
                .ruleCode("ASOF_RULE_" + System.currentTimeMillis())
                .name("As Of Rule")
                .category(BusinessRuleCategory.REGULATORY)
                .subCategory("Zakat Rules")
                .ruleType(BusinessRuleType.THRESHOLD)
                .severity(RuleSeverity.INFORMATIONAL)
                .effectiveFrom(LocalDate.now())
                .priority(50)
                .build());

        BusinessRuleVersionResponse snapshot = businessRuleService.getRuleAsOf(created.getId(), Instant.now().plusSeconds(1));

        assertThat(snapshot.getVersionNumber()).isEqualTo(1);
        assertThat(snapshot.getRuleSnapshot()).containsEntry("ruleCode", created.getRuleCode());
    }
}
