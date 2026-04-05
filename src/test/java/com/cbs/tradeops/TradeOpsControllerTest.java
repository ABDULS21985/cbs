package com.cbs.tradeops;

import com.cbs.common.exception.GlobalExceptionHandler;
import com.cbs.tradeops.controller.TradeOpsController;
import com.cbs.tradeops.entity.ClearingSubmission;
import com.cbs.tradeops.entity.OrderAllocation;
import com.cbs.tradeops.entity.TradeConfirmation;
import com.cbs.tradeops.entity.TradeReport;
import com.cbs.tradeops.service.TradeOpsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TradeOpsControllerTest {

    private MockMvc mockMvc;

    @Mock
    private TradeOpsService service;

    @InjectMocks
    private TradeOpsController controller;

    private ObjectMapper objectMapper;

    private TradeConfirmation sampleConfirmation;
    private OrderAllocation sampleAllocation;
    private ClearingSubmission sampleClearing;
    private TradeReport sampleReport;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        sampleConfirmation = new TradeConfirmation();
        sampleConfirmation.setId(1L);
        sampleConfirmation.setConfirmationRef("TC-ABC1234567");
        sampleConfirmation.setTradeRef("TRD-001");
        sampleConfirmation.setInstrumentType("BOND");
        sampleConfirmation.setOurSide("BUY");
        sampleConfirmation.setCounterpartyCode("CP001");
        sampleConfirmation.setCounterpartyName("Counterparty Ltd");
        sampleConfirmation.setTradeDate(LocalDate.now());
        sampleConfirmation.setSettlementDate(LocalDate.now().plusDays(2));
        sampleConfirmation.setCurrency("USD");
        sampleConfirmation.setAmount(new BigDecimal("1000000"));
        sampleConfirmation.setPrice(new BigDecimal("99.50"));
        sampleConfirmation.setOurDetails(Map.of("qty", 100, "price", "99.50"));
        sampleConfirmation.setMatchStatus("UNMATCHED");
        sampleConfirmation.setStatus("PENDING");

        sampleAllocation = new OrderAllocation();
        sampleAllocation.setId(1L);
        sampleAllocation.setAllocationRef("OA-XYZ1234567");
        sampleAllocation.setBlockOrderRef("BLK-001");
        sampleAllocation.setInstrumentCode("AAPL");
        sampleAllocation.setInstrumentName("Apple Inc.");
        sampleAllocation.setOrderSide("BUY");
        sampleAllocation.setTotalQuantity(new BigDecimal("1000"));
        sampleAllocation.setTotalAmount(new BigDecimal("150000"));
        sampleAllocation.setAvgPrice(new BigDecimal("150.00"));
        sampleAllocation.setAllocationMethod("PRO_RATA");
        sampleAllocation.setAllocations(Map.of("ACC-001", 500, "ACC-002", 500));
        sampleAllocation.setAllocatedAt(Instant.now());
        sampleAllocation.setStatus("ALLOCATED");

        sampleClearing = new ClearingSubmission();
        sampleClearing.setId(1L);
        sampleClearing.setSubmissionRef("CS-DEF1234567");
        sampleClearing.setTradeRef("TRD-001");
        sampleClearing.setCcpName("LCH Clearnet");
        sampleClearing.setCcpCode("LCH");
        sampleClearing.setInstrumentType("SWAP");
        sampleClearing.setClearingMemberId("CM-001");
        sampleClearing.setTradeDate(LocalDate.now());
        sampleClearing.setSettlementDate(LocalDate.now().plusDays(2));
        sampleClearing.setCurrency("USD");
        sampleClearing.setNotionalAmount(new BigDecimal("5000000"));
        sampleClearing.setInitialMargin(new BigDecimal("250000"));
        sampleClearing.setVariationMargin(new BigDecimal("50000"));
        sampleClearing.setMarginCurrency("USD");
        sampleClearing.setSubmittedAt(Instant.now());
        sampleClearing.setStatus("SUBMITTED");

        sampleReport = new TradeReport();
        sampleReport.setId(1L);
        sampleReport.setReportRef("TR-GHI1234567");
        sampleReport.setTradeRef("TRD-001");
        sampleReport.setReportType("NEW");
        sampleReport.setRegime("EMIR");
        sampleReport.setTradeRepository("DTCC");
        sampleReport.setReportData(Map.of("notional", "5000000", "currency", "USD"));
        sampleReport.setUti("UTI-001");
        sampleReport.setLei("LEI-001");
        sampleReport.setSubmittedAt(Instant.now());
        sampleReport.setStatus("SUBMITTED");
    }

    // ========== CONFIRMATION ENDPOINTS ==========

    @Nested
    @DisplayName("Confirmation Endpoints")
    class ConfirmationEndpoints {

        @Test
        @DisplayName("GET /v1/trade-ops/confirmations - should return all confirmations")
        void listConfirmations() throws Exception {
            when(service.getAllConfirmations()).thenReturn(List.of(sampleConfirmation));

            mockMvc.perform(get("/v1/trade-ops/confirmations"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].confirmationRef").value("TC-ABC1234567"))
                    .andExpect(jsonPath("$.data[0].tradeRef").value("TRD-001"))
                    .andExpect(jsonPath("$.data[0].instrumentType").value("BOND"))
                    .andExpect(jsonPath("$.data[0].matchStatus").value("UNMATCHED"))
                    .andExpect(jsonPath("$.data[0].status").value("PENDING"));

            verify(service).getAllConfirmations();
        }

        @Test
        @DisplayName("GET /v1/trade-ops/confirmations - should return empty list")
        void listConfirmations_Empty() throws Exception {
            when(service.getAllConfirmations()).thenReturn(List.of());

            mockMvc.perform(get("/v1/trade-ops/confirmations"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("GET /v1/trade-ops/confirmations - should return multiple confirmations")
        void listConfirmations_Multiple() throws Exception {
            TradeConfirmation second = new TradeConfirmation();
            second.setId(2L);
            second.setConfirmationRef("TC-ZZZ9999999");
            second.setTradeRef("TRD-002");
            second.setInstrumentType("EQUITY");
            second.setOurSide("SELL");
            second.setCounterpartyCode("CP002");
            second.setCounterpartyName("Other Bank");
            second.setTradeDate(LocalDate.now());
            second.setCurrency("EUR");
            second.setAmount(new BigDecimal("500000"));
            second.setOurDetails(Map.of("qty", 200));
            second.setMatchStatus("MATCHED");
            second.setStatus("CONFIRMED");

            when(service.getAllConfirmations()).thenReturn(List.of(sampleConfirmation, second));

            mockMvc.perform(get("/v1/trade-ops/confirmations"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[1].confirmationRef").value("TC-ZZZ9999999"))
                    .andExpect(jsonPath("$.data[1].instrumentType").value("EQUITY"));
        }

        @Test
        @DisplayName("POST /v1/trade-ops/confirmations - should submit a new confirmation")
        void submitConfirmation() throws Exception {
            when(service.submitConfirmation(any(TradeConfirmation.class))).thenReturn(sampleConfirmation);

            TradeConfirmation request = new TradeConfirmation();
            request.setTradeRef("TRD-001");
            request.setInstrumentType("BOND");
            request.setOurSide("BUY");
            request.setCounterpartyCode("CP001");
            request.setCounterpartyName("Counterparty Ltd");
            request.setTradeDate(LocalDate.now());
            request.setSettlementDate(LocalDate.now().plusDays(2));
            request.setCurrency("USD");
            request.setAmount(new BigDecimal("1000000"));
            request.setPrice(new BigDecimal("99.50"));
            request.setOurDetails(Map.of("qty", 100, "price", "99.50"));

            mockMvc.perform(post("/v1/trade-ops/confirmations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.confirmationRef").value("TC-ABC1234567"))
                    .andExpect(jsonPath("$.data.tradeRef").value("TRD-001"))
                    .andExpect(jsonPath("$.data.matchStatus").value("UNMATCHED"))
                    .andExpect(jsonPath("$.data.status").value("PENDING"));

            verify(service).submitConfirmation(any(TradeConfirmation.class));
        }

        @Test
        @DisplayName("POST /v1/trade-ops/confirmations - should submit confirmation with minimal fields")
        void submitConfirmation_Minimal() throws Exception {
            TradeConfirmation minimal = new TradeConfirmation();
            minimal.setId(2L);
            minimal.setConfirmationRef("TC-MIN0000001");
            minimal.setTradeRef("TRD-MIN");
            minimal.setInstrumentType("FX");
            minimal.setOurSide("BUY");
            minimal.setCounterpartyCode("CP999");
            minimal.setCounterpartyName("Minimal CP");
            minimal.setTradeDate(LocalDate.now());
            minimal.setCurrency("GBP");
            minimal.setAmount(new BigDecimal("200000"));
            minimal.setOurDetails(Map.of("rate", "1.25"));
            minimal.setMatchStatus("UNMATCHED");
            minimal.setStatus("PENDING");

            when(service.submitConfirmation(any(TradeConfirmation.class))).thenReturn(minimal);

            String json = objectMapper.writeValueAsString(minimal);

            mockMvc.perform(post("/v1/trade-ops/confirmations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.confirmationRef").value("TC-MIN0000001"))
                    .andExpect(jsonPath("$.data.instrumentType").value("FX"));
        }

        @Test
        @DisplayName("POST /v1/trade-ops/confirmations/match - should match two confirmations")
        void matchConfirmation() throws Exception {
            TradeConfirmation matchedA = new TradeConfirmation();
            matchedA.setId(1L);
            matchedA.setConfirmationRef("TC-AAA0000001");
            matchedA.setTradeRef("TRD-001");
            matchedA.setInstrumentType("BOND");
            matchedA.setOurSide("BUY");
            matchedA.setCounterpartyCode("CP001");
            matchedA.setCounterpartyName("Counterparty Ltd");
            matchedA.setTradeDate(LocalDate.now());
            matchedA.setCurrency("USD");
            matchedA.setAmount(new BigDecimal("1000000"));
            matchedA.setOurDetails(Map.of("qty", 100));
            matchedA.setMatchStatus("MATCHED");
            matchedA.setMatchedAt(Instant.now());
            matchedA.setStatus("CONFIRMED");

            TradeConfirmation matchedB = new TradeConfirmation();
            matchedB.setId(2L);
            matchedB.setConfirmationRef("TC-BBB0000001");
            matchedB.setTradeRef("TRD-001");
            matchedB.setInstrumentType("BOND");
            matchedB.setOurSide("SELL");
            matchedB.setCounterpartyCode("CP002");
            matchedB.setCounterpartyName("Our Bank");
            matchedB.setTradeDate(LocalDate.now());
            matchedB.setCurrency("USD");
            matchedB.setAmount(new BigDecimal("1000000"));
            matchedB.setOurDetails(Map.of("qty", 100));
            matchedB.setMatchStatus("MATCHED");
            matchedB.setMatchedAt(Instant.now());
            matchedB.setStatus("CONFIRMED");

            when(service.matchConfirmation("TC-AAA0000001", "TC-BBB0000001"))
                    .thenReturn(List.of(matchedA, matchedB));

            mockMvc.perform(post("/v1/trade-ops/confirmations/match")
                            .param("refA", "TC-AAA0000001")
                            .param("refB", "TC-BBB0000001"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[0].matchStatus").value("MATCHED"))
                    .andExpect(jsonPath("$.data[0].status").value("CONFIRMED"))
                    .andExpect(jsonPath("$.data[1].matchStatus").value("MATCHED"))
                    .andExpect(jsonPath("$.data[1].status").value("CONFIRMED"));

            verify(service).matchConfirmation("TC-AAA0000001", "TC-BBB0000001");
        }

        @Test
        @DisplayName("POST /v1/trade-ops/confirmations/match - should return disputed when breaks found")
        void matchConfirmation_Disputed() throws Exception {
            TradeConfirmation disputedA = new TradeConfirmation();
            disputedA.setId(1L);
            disputedA.setConfirmationRef("TC-AAA0000001");
            disputedA.setTradeRef("TRD-001");
            disputedA.setInstrumentType("BOND");
            disputedA.setOurSide("BUY");
            disputedA.setCounterpartyCode("CP001");
            disputedA.setCounterpartyName("Counterparty Ltd");
            disputedA.setTradeDate(LocalDate.now());
            disputedA.setCurrency("USD");
            disputedA.setAmount(new BigDecimal("1000000"));
            disputedA.setOurDetails(Map.of("qty", 100));
            disputedA.setMatchStatus("DISPUTED");
            disputedA.setBreakFields(Map.of("qty", Map.of("ours", "100", "theirs", "200")));
            disputedA.setStatus("PENDING");

            TradeConfirmation disputedB = new TradeConfirmation();
            disputedB.setId(2L);
            disputedB.setConfirmationRef("TC-BBB0000001");
            disputedB.setTradeRef("TRD-001");
            disputedB.setInstrumentType("BOND");
            disputedB.setOurSide("SELL");
            disputedB.setCounterpartyCode("CP002");
            disputedB.setCounterpartyName("Our Bank");
            disputedB.setTradeDate(LocalDate.now());
            disputedB.setCurrency("USD");
            disputedB.setAmount(new BigDecimal("1000000"));
            disputedB.setOurDetails(Map.of("qty", 200));
            disputedB.setMatchStatus("DISPUTED");
            disputedB.setBreakFields(Map.of("qty", Map.of("ours", "100", "theirs", "200")));
            disputedB.setStatus("PENDING");

            when(service.matchConfirmation("TC-AAA0000001", "TC-BBB0000001"))
                    .thenReturn(List.of(disputedA, disputedB));

            mockMvc.perform(post("/v1/trade-ops/confirmations/match")
                            .param("refA", "TC-AAA0000001")
                            .param("refB", "TC-BBB0000001"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[0].matchStatus").value("DISPUTED"))
                    .andExpect(jsonPath("$.data[0].breakFields").isNotEmpty())
                    .andExpect(jsonPath("$.data[1].matchStatus").value("DISPUTED"));
        }

        @Test
        @DisplayName("GET /v1/trade-ops/confirmations/unmatched - should return unmatched confirmations")
        void getUnmatched() throws Exception {
            when(service.getUnmatched()).thenReturn(List.of(sampleConfirmation));

            mockMvc.perform(get("/v1/trade-ops/confirmations/unmatched"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].matchStatus").value("UNMATCHED"));

            verify(service).getUnmatched();
        }

        @Test
        @DisplayName("GET /v1/trade-ops/confirmations/unmatched - should return empty when all matched")
        void getUnmatched_Empty() throws Exception {
            when(service.getUnmatched()).thenReturn(List.of());

            mockMvc.perform(get("/v1/trade-ops/confirmations/unmatched"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }
    }

    // ========== ALLOCATION ENDPOINTS ==========

    @Nested
    @DisplayName("Allocation Endpoints")
    class AllocationEndpoints {

        @Test
        @DisplayName("GET /v1/trade-ops/allocations - should return all allocations")
        void listAllocations() throws Exception {
            when(service.getAllAllocations()).thenReturn(List.of(sampleAllocation));

            mockMvc.perform(get("/v1/trade-ops/allocations"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].allocationRef").value("OA-XYZ1234567"))
                    .andExpect(jsonPath("$.data[0].blockOrderRef").value("BLK-001"))
                    .andExpect(jsonPath("$.data[0].instrumentCode").value("AAPL"))
                    .andExpect(jsonPath("$.data[0].allocationMethod").value("PRO_RATA"))
                    .andExpect(jsonPath("$.data[0].status").value("ALLOCATED"));

            verify(service).getAllAllocations();
        }

        @Test
        @DisplayName("GET /v1/trade-ops/allocations - should return empty list")
        void listAllocations_Empty() throws Exception {
            when(service.getAllAllocations()).thenReturn(List.of());

            mockMvc.perform(get("/v1/trade-ops/allocations"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("GET /v1/trade-ops/allocations - should return multiple allocations")
        void listAllocations_Multiple() throws Exception {
            OrderAllocation second = new OrderAllocation();
            second.setId(2L);
            second.setAllocationRef("OA-QWE1234567");
            second.setBlockOrderRef("BLK-002");
            second.setInstrumentCode("MSFT");
            second.setInstrumentName("Microsoft Corp.");
            second.setOrderSide("SELL");
            second.setTotalQuantity(new BigDecimal("500"));
            second.setTotalAmount(new BigDecimal("200000"));
            second.setAvgPrice(new BigDecimal("400.00"));
            second.setAllocationMethod("EQUAL");
            second.setAllocations(Map.of("ACC-003", 250, "ACC-004", 250));
            second.setAllocatedAt(Instant.now());
            second.setStatus("ALLOCATED");

            when(service.getAllAllocations()).thenReturn(List.of(sampleAllocation, second));

            mockMvc.perform(get("/v1/trade-ops/allocations"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[1].allocationRef").value("OA-QWE1234567"))
                    .andExpect(jsonPath("$.data[1].instrumentCode").value("MSFT"));
        }

        @Test
        @DisplayName("POST /v1/trade-ops/allocations - should submit a new allocation")
        void submitAllocation() throws Exception {
            when(service.allocateOrder(any(OrderAllocation.class))).thenReturn(sampleAllocation);

            OrderAllocation request = new OrderAllocation();
            request.setBlockOrderRef("BLK-001");
            request.setInstrumentCode("AAPL");
            request.setInstrumentName("Apple Inc.");
            request.setOrderSide("BUY");
            request.setTotalQuantity(new BigDecimal("1000"));
            request.setTotalAmount(new BigDecimal("150000"));
            request.setAvgPrice(new BigDecimal("150.00"));
            request.setAllocationMethod("PRO_RATA");
            request.setAllocations(Map.of("ACC-001", 500, "ACC-002", 500));

            mockMvc.perform(post("/v1/trade-ops/allocations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.allocationRef").value("OA-XYZ1234567"))
                    .andExpect(jsonPath("$.data.blockOrderRef").value("BLK-001"))
                    .andExpect(jsonPath("$.data.status").value("ALLOCATED"));

            verify(service).allocateOrder(any(OrderAllocation.class));
        }

        @Test
        @DisplayName("POST /v1/trade-ops/allocations - should submit allocation with EQUAL method")
        void submitAllocation_EqualMethod() throws Exception {
            OrderAllocation equalAlloc = new OrderAllocation();
            equalAlloc.setId(3L);
            equalAlloc.setAllocationRef("OA-EQL0000001");
            equalAlloc.setBlockOrderRef("BLK-003");
            equalAlloc.setInstrumentCode("GOOGL");
            equalAlloc.setOrderSide("BUY");
            equalAlloc.setTotalQuantity(new BigDecimal("300"));
            equalAlloc.setTotalAmount(new BigDecimal("450000"));
            equalAlloc.setAvgPrice(new BigDecimal("1500.00"));
            equalAlloc.setAllocationMethod("EQUAL");
            equalAlloc.setAllocations(Map.of("ACC-001", 100, "ACC-002", 100, "ACC-003", 100));
            equalAlloc.setAllocatedAt(Instant.now());
            equalAlloc.setStatus("ALLOCATED");

            when(service.allocateOrder(any(OrderAllocation.class))).thenReturn(equalAlloc);

            mockMvc.perform(post("/v1/trade-ops/allocations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(equalAlloc)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.allocationMethod").value("EQUAL"))
                    .andExpect(jsonPath("$.data.allocationRef").value("OA-EQL0000001"));
        }
    }

    // ========== CLEARING ENDPOINTS ==========

    @Nested
    @DisplayName("Clearing Endpoints")
    class ClearingEndpoints {

        @Test
        @DisplayName("GET /v1/trade-ops/clearing - should return all clearing submissions")
        void listClearing() throws Exception {
            when(service.getAllClearingSubmissions()).thenReturn(List.of(sampleClearing));

            mockMvc.perform(get("/v1/trade-ops/clearing"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].submissionRef").value("CS-DEF1234567"))
                    .andExpect(jsonPath("$.data[0].ccpName").value("LCH Clearnet"))
                    .andExpect(jsonPath("$.data[0].instrumentType").value("SWAP"))
                    .andExpect(jsonPath("$.data[0].notionalAmount").value(5000000))
                    .andExpect(jsonPath("$.data[0].status").value("SUBMITTED"));

            verify(service).getAllClearingSubmissions();
        }

        @Test
        @DisplayName("GET /v1/trade-ops/clearing - should return empty list")
        void listClearing_Empty() throws Exception {
            when(service.getAllClearingSubmissions()).thenReturn(List.of());

            mockMvc.perform(get("/v1/trade-ops/clearing"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("GET /v1/trade-ops/clearing - should return multiple clearing submissions")
        void listClearing_Multiple() throws Exception {
            ClearingSubmission second = new ClearingSubmission();
            second.setId(2L);
            second.setSubmissionRef("CS-GHI1234567");
            second.setTradeRef("TRD-002");
            second.setCcpName("CME");
            second.setCcpCode("CME");
            second.setInstrumentType("FUTURE");
            second.setTradeDate(LocalDate.now());
            second.setCurrency("EUR");
            second.setNotionalAmount(new BigDecimal("2000000"));
            second.setStatus("CLEARED");

            when(service.getAllClearingSubmissions()).thenReturn(List.of(sampleClearing, second));

            mockMvc.perform(get("/v1/trade-ops/clearing"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[1].submissionRef").value("CS-GHI1234567"))
                    .andExpect(jsonPath("$.data[1].ccpName").value("CME"));
        }

        @Test
        @DisplayName("POST /v1/trade-ops/clearing - should submit for clearing")
        void submitForClearing() throws Exception {
            when(service.submitForClearing(any(ClearingSubmission.class))).thenReturn(sampleClearing);

            ClearingSubmission request = new ClearingSubmission();
            request.setTradeRef("TRD-001");
            request.setCcpName("LCH Clearnet");
            request.setCcpCode("LCH");
            request.setInstrumentType("SWAP");
            request.setClearingMemberId("CM-001");
            request.setTradeDate(LocalDate.now());
            request.setSettlementDate(LocalDate.now().plusDays(2));
            request.setCurrency("USD");
            request.setNotionalAmount(new BigDecimal("5000000"));
            request.setInitialMargin(new BigDecimal("250000"));
            request.setVariationMargin(new BigDecimal("50000"));
            request.setMarginCurrency("USD");

            mockMvc.perform(post("/v1/trade-ops/clearing")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.submissionRef").value("CS-DEF1234567"))
                    .andExpect(jsonPath("$.data.ccpName").value("LCH Clearnet"))
                    .andExpect(jsonPath("$.data.status").value("SUBMITTED"));

            verify(service).submitForClearing(any(ClearingSubmission.class));
        }

        @Test
        @DisplayName("POST /v1/trade-ops/clearing - should submit with minimal fields")
        void submitForClearing_Minimal() throws Exception {
            ClearingSubmission minimal = new ClearingSubmission();
            minimal.setId(3L);
            minimal.setSubmissionRef("CS-MIN0000001");
            minimal.setTradeRef("TRD-MIN");
            minimal.setCcpName("Eurex");
            minimal.setInstrumentType("OPTION");
            minimal.setTradeDate(LocalDate.now());
            minimal.setCurrency("EUR");
            minimal.setNotionalAmount(new BigDecimal("1000000"));
            minimal.setSubmittedAt(Instant.now());
            minimal.setStatus("SUBMITTED");

            when(service.submitForClearing(any(ClearingSubmission.class))).thenReturn(minimal);

            mockMvc.perform(post("/v1/trade-ops/clearing")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(minimal)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.submissionRef").value("CS-MIN0000001"))
                    .andExpect(jsonPath("$.data.ccpName").value("Eurex"));
        }

        @Test
        @DisplayName("GET /v1/trade-ops/clearing/pending - should return pending clearing submissions")
        void getPendingClearing() throws Exception {
            when(service.getPendingClearing()).thenReturn(List.of(sampleClearing));

            mockMvc.perform(get("/v1/trade-ops/clearing/pending"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].status").value("SUBMITTED"));

            verify(service).getPendingClearing();
        }

        @Test
        @DisplayName("GET /v1/trade-ops/clearing/pending - should return empty when none pending")
        void getPendingClearing_Empty() throws Exception {
            when(service.getPendingClearing()).thenReturn(List.of());

            mockMvc.perform(get("/v1/trade-ops/clearing/pending"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }
    }

    // ========== REPORT ENDPOINTS ==========

    @Nested
    @DisplayName("Report Endpoints")
    class ReportEndpoints {

        @Test
        @DisplayName("GET /v1/trade-ops/reports - should return all reports")
        void listReports() throws Exception {
            when(service.getAllReports()).thenReturn(List.of(sampleReport));

            mockMvc.perform(get("/v1/trade-ops/reports"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].reportRef").value("TR-GHI1234567"))
                    .andExpect(jsonPath("$.data[0].reportType").value("NEW"))
                    .andExpect(jsonPath("$.data[0].regime").value("EMIR"))
                    .andExpect(jsonPath("$.data[0].tradeRepository").value("DTCC"))
                    .andExpect(jsonPath("$.data[0].status").value("SUBMITTED"));

            verify(service).getAllReports();
        }

        @Test
        @DisplayName("GET /v1/trade-ops/reports - should return empty list")
        void listReports_Empty() throws Exception {
            when(service.getAllReports()).thenReturn(List.of());

            mockMvc.perform(get("/v1/trade-ops/reports"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("GET /v1/trade-ops/reports - should return multiple reports")
        void listReports_Multiple() throws Exception {
            TradeReport second = new TradeReport();
            second.setId(2L);
            second.setReportRef("TR-JKL1234567");
            second.setTradeRef("TRD-002");
            second.setReportType("MODIFY");
            second.setRegime("MIFIR");
            second.setTradeRepository("REGIS-TR");
            second.setReportData(Map.of("notional", "2000000", "currency", "EUR"));
            second.setStatus("SUBMITTED");

            when(service.getAllReports()).thenReturn(List.of(sampleReport, second));

            mockMvc.perform(get("/v1/trade-ops/reports"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[1].reportRef").value("TR-JKL1234567"))
                    .andExpect(jsonPath("$.data[1].regime").value("MIFIR"));
        }

        @Test
        @DisplayName("POST /v1/trade-ops/reports - should submit a new trade report")
        void submitTradeReport() throws Exception {
            when(service.submitTradeReport(any(TradeReport.class))).thenReturn(sampleReport);

            TradeReport request = new TradeReport();
            request.setTradeRef("TRD-001");
            request.setReportType("NEW");
            request.setRegime("EMIR");
            request.setTradeRepository("DTCC");
            request.setReportData(Map.of("notional", "5000000", "currency", "USD"));
            request.setUti("UTI-001");
            request.setLei("LEI-001");

            mockMvc.perform(post("/v1/trade-ops/reports")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.reportRef").value("TR-GHI1234567"))
                    .andExpect(jsonPath("$.data.reportType").value("NEW"))
                    .andExpect(jsonPath("$.data.regime").value("EMIR"))
                    .andExpect(jsonPath("$.data.status").value("SUBMITTED"));

            verify(service).submitTradeReport(any(TradeReport.class));
        }

        @Test
        @DisplayName("POST /v1/trade-ops/reports - should submit report with minimal fields")
        void submitTradeReport_Minimal() throws Exception {
            TradeReport minimal = new TradeReport();
            minimal.setId(3L);
            minimal.setReportRef("TR-MIN0000001");
            minimal.setTradeRef("TRD-MIN");
            minimal.setReportType("CANCEL");
            minimal.setRegime("SFTR");
            minimal.setReportData(Map.of("action", "CANCEL"));
            minimal.setSubmittedAt(Instant.now());
            minimal.setStatus("SUBMITTED");

            when(service.submitTradeReport(any(TradeReport.class))).thenReturn(minimal);

            mockMvc.perform(post("/v1/trade-ops/reports")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(minimal)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.reportRef").value("TR-MIN0000001"))
                    .andExpect(jsonPath("$.data.reportType").value("CANCEL"))
                    .andExpect(jsonPath("$.data.regime").value("SFTR"));
        }
    }
}
