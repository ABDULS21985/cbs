package com.cbs.regulatory.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.entity.RegulatoryReturnLineItem;
import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import com.cbs.regulatory.repository.RegulatoryReturnLineItemRepository;
import com.cbs.regulatory.repository.RegulatoryReturnRepository;
import com.cbs.regulatory.repository.RegulatoryReturnTemplateRepository;
import com.cbs.regulatory.repository.ReturnAuditEventRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegulatoryTemplateEngineTest {

    @Mock private RegulatoryReturnTemplateRepository templateRepository;
    @Mock private RegulatoryReturnRepository returnRepository;
    @Mock private RegulatoryReturnLineItemRepository lineItemRepository;
    @Mock private ReturnAuditEventRepository auditEventRepository;
    @Mock private RegulatoryDataExtractionService extractionService;
    @Mock private CurrentActorProvider actorProvider;
    @Mock private CurrentTenantResolver tenantResolver;

    @InjectMocks
    private RegulatoryTemplateEngine templateEngine;

    private RegulatoryReturnTemplate template;
    private final AtomicReference<RegulatoryReturn> savedReturn = new AtomicReference<>();
    private final List<RegulatoryReturnLineItem> savedLineItems = new ArrayList<>();
    private final AtomicLong returnIdSequence = new AtomicLong(1);
    private final AtomicLong lineIdSequence = new AtomicLong(1);

    @BeforeEach
    void setUp() {
        template = RegulatoryReturnTemplate.builder()
                .id(99L)
                .templateCode("TEST-BS-V1")
                .jurisdiction(RegulatoryDomainEnums.Jurisdiction.SA_SAMA)
                .returnType(RegulatoryDomainEnums.ReturnType.BALANCE_SHEET)
                .name("Test Balance Sheet")
                .versionNumber(1)
                .effectiveFrom(LocalDate.of(2026, 1, 1))
                .sections(List.of(
                        section("ASSETS", List.of(
                                line("L001", "Cash", "AMOUNT", 1, Map.of("type", "GL_BALANCE", "glAccountCodes", List.of("1100-000-001"), "balanceType", "CLOSING")),
                                line("L002", "Murabaha", "AMOUNT", 2, Map.of("type", "GL_BALANCE", "glAccountCodes", List.of("1200-MRB-001"), "balanceType", "CLOSING")),
                                line("L003", "Total Assets", "AMOUNT", 3, Map.of("type", "CALCULATED", "formula", "L001 + L002"))
                        ))
                ))
                .validationRules(List.of(Map.of(
                        "ruleCode", "BALANCE",
                        "expression", "L003 == 150",
                        "severity", "ERROR",
                        "message", "Total assets mismatch"
                )))
                .crossValidations(List.of())
                .outputFormat(RegulatoryDomainEnums.OutputFormat.EXCEL)
                .reportingFrequency(RegulatoryDomainEnums.ReportingPeriodType.MONTHLY)
                .filingDeadlineDaysAfterPeriod(15)
                .isActive(true)
                .tenantId(1L)
                .build();

        lenient().when(actorProvider.getCurrentActor()).thenReturn("tester");
        lenient().when(tenantResolver.getCurrentTenantIdOrDefault(1L)).thenReturn(1L);
        lenient().when(templateRepository.findByTemplateCode("TEST-BS-V1")).thenReturn(Optional.of(template));
        lenient().when(returnRepository.findTopByTemplateCodeAndPeriodToBeforeOrderByPeriodToDesc(anyString(), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        lenient().when(returnRepository.findById(any())).thenAnswer(invocation ->
                Optional.ofNullable(savedReturn.get()).filter(item -> item.getId().equals(invocation.getArgument(0, Long.class))));
        lenient().when(returnRepository.findByTemplateCodeAndPeriodFromAndPeriodToOrderByReturnDataVersionDesc(anyString(), any(), any()))
                .thenReturn(List.of());

        lenient().when(returnRepository.save(any(RegulatoryReturn.class))).thenAnswer(invocation -> {
            RegulatoryReturn regulatoryReturn = invocation.getArgument(0);
            if (regulatoryReturn.getId() == null) {
                regulatoryReturn.setId(returnIdSequence.getAndIncrement());
            }
            savedReturn.set(regulatoryReturn);
            return regulatoryReturn;
        });

        lenient().when(lineItemRepository.save(any(RegulatoryReturnLineItem.class))).thenAnswer(invocation -> {
            RegulatoryReturnLineItem item = invocation.getArgument(0);
            if (item.getId() == null) {
                item.setId(lineIdSequence.getAndIncrement());
            }
            savedLineItems.removeIf(existing -> existing.getReturnId().equals(item.getReturnId())
                    && existing.getLineNumber().equals(item.getLineNumber()));
            savedLineItems.add(item);
            return item;
        });

        lenient().when(lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(any())).thenAnswer(invocation -> {
            Long returnId = invocation.getArgument(0, Long.class);
            return savedLineItems.stream().filter(item -> item.getReturnId().equals(returnId)).toList();
        });

        lenient().when(extractionService.extractGlBalance(eq(List.of("1100-000-001")), any(LocalDate.class), eq("CLOSING")))
                .thenReturn(new BigDecimal("100.00"));
        lenient().when(extractionService.extractGlBalance(eq(List.of("1200-MRB-001")), any(LocalDate.class), eq("CLOSING")))
                .thenReturn(new BigDecimal("50.00"));
    }

    @Test
    void generateReturn_populatesCalculatedLineAndValidates() {
        RegulatoryReturn regulatoryReturn = templateEngine.generateReturn(
                "TEST-BS-V1",
                LocalDate.of(2026, 3, 31),
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 31));

        assertThat(regulatoryReturn.getValidationStatus()).isEqualTo(RegulatoryDomainEnums.ReturnValidationStatus.VALID);
        assertThat(savedLineItems).extracting(RegulatoryReturnLineItem::getLineNumber, RegulatoryReturnLineItem::getValue)
                .contains(tuple("L001", "100.00"), tuple("L002", "50.00"), tuple("L003", "150.00"));
        assertThat(regulatoryReturn.getReturnData()).containsKey("sections");
    }

    @Test
    void generateReturn_marksInvalidWhenValidationFails() {
        template.setValidationRules(List.of(Map.of(
                "ruleCode", "BALANCE",
                "expression", "L003 == 999",
                "severity", "ERROR",
                "message", "Expected imbalance"
        )));

        RegulatoryReturn regulatoryReturn = templateEngine.generateReturn(
                "TEST-BS-V1",
                LocalDate.of(2026, 3, 31),
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 31));

        assertThat(regulatoryReturn.getValidationStatus()).isEqualTo(RegulatoryDomainEnums.ReturnValidationStatus.INVALID);
        assertThat(regulatoryReturn.getValidationErrors()).isNotNull();
    }

    @Test
    void exportReturn_excelProducesWorkbookBytes() {
        RegulatoryReturn regulatoryReturn = RegulatoryReturn.builder()
                .id(7L)
                .returnRef("RET-7")
                .templateCode("TEST-BS-V1")
                .jurisdiction(RegulatoryDomainEnums.Jurisdiction.SA_SAMA)
                .returnType(RegulatoryDomainEnums.ReturnType.BALANCE_SHEET)
                .periodFrom(LocalDate.of(2026, 3, 1))
                .periodTo(LocalDate.of(2026, 3, 31))
                .reportingDate(LocalDate.of(2026, 3, 31))
                .currencyCode("SAR")
                .build();
        savedReturn.set(regulatoryReturn);
        savedLineItems.clear();
        savedLineItems.add(RegulatoryReturnLineItem.builder()
                .id(1L)
                .returnId(7L)
                .sectionCode("ASSETS")
                .lineNumber("L001")
                .lineDescription("Cash")
                .dataType(RegulatoryDomainEnums.ReturnLineDataType.AMOUNT)
                .value("100.00")
                .build());

        byte[] workbook = templateEngine.exportReturn(7L, RegulatoryDomainEnums.OutputFormat.EXCEL);

        assertThat(workbook).isNotEmpty();
        assertThat(new String(workbook, 0, 2)).isEqualTo("PK");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> section(String code, List<Map<String, Object>> lines) {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("sectionCode", code);
        section.put("sectionName", code);
        section.put("displayOrder", 1);
        section.put("lineItems", lines);
        return section;
    }

    private Map<String, Object> line(String lineNumber, String description, String dataType, int displayOrder, Map<String, Object> rule) {
        Map<String, Object> line = new LinkedHashMap<>();
        line.put("lineNumber", lineNumber);
        line.put("description", description);
        line.put("dataType", dataType);
        line.put("displayOrder", displayOrder);
        line.put("extractionRule", rule);
        return line;
    }
}
