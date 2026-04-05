package com.cbs.trade;

import com.cbs.common.exception.GlobalExceptionHandler;
import com.cbs.trade.controller.FactoringController;
import com.cbs.trade.entity.FactoringFacility;
import com.cbs.trade.entity.FactoringTransaction;
import com.cbs.trade.service.FactoringService;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FactoringControllerTest {

    private MockMvc mockMvc;

    @Mock
    private FactoringService factoringService;

    @InjectMocks
    private FactoringController controller;

    private ObjectMapper objectMapper;

    private FactoringFacility sampleFacility;
    private FactoringTransaction sampleTransaction;
    private FactoringTransaction fundedTransaction;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        sampleFacility = new FactoringFacility();
        sampleFacility.setId(1L);
        sampleFacility.setFacilityCode("FF-TEST00001");
        sampleFacility.setFacilityType("RECOURSE");
        sampleFacility.setSellerCustomerId(10L);
        sampleFacility.setSellerName("Seller Corp");
        sampleFacility.setCurrency("USD");
        sampleFacility.setFacilityLimit(new BigDecimal("10000000"));
        sampleFacility.setUtilizedAmount(BigDecimal.ZERO);
        sampleFacility.setAvailableAmount(new BigDecimal("10000000"));
        sampleFacility.setAdvanceRatePct(new BigDecimal("85.00"));
        sampleFacility.setDiscountRatePct(new BigDecimal("8.0000"));
        sampleFacility.setServiceFeeRatePct(new BigDecimal("0.5000"));
        sampleFacility.setCollectionPeriodDays(60);
        sampleFacility.setStatus("APPROVED");

        sampleTransaction = new FactoringTransaction();
        sampleTransaction.setId(1L);
        sampleTransaction.setFacilityId(1L);
        sampleTransaction.setInvoiceRef("INV-001");
        sampleTransaction.setInvoiceDate(LocalDate.now());
        sampleTransaction.setInvoiceAmount(new BigDecimal("1000000"));
        sampleTransaction.setBuyerName("Buyer Corp");
        sampleTransaction.setBuyerId(20L);
        sampleTransaction.setStatus("SUBMITTED");

        fundedTransaction = new FactoringTransaction();
        fundedTransaction.setId(1L);
        fundedTransaction.setFacilityId(1L);
        fundedTransaction.setInvoiceRef("INV-001");
        fundedTransaction.setInvoiceAmount(new BigDecimal("1000000"));
        fundedTransaction.setAdvanceAmount(new BigDecimal("850000.0000"));
        fundedTransaction.setDiscountAmount(new BigDecimal("11178.0822"));
        fundedTransaction.setNetProceedsToSeller(new BigDecimal("838821.9178"));
        fundedTransaction.setServiceFeeCharged(new BigDecimal("5000.0000"));
        fundedTransaction.setCollectionDueDate(LocalDate.now().plusDays(60));
        fundedTransaction.setStatus("FUNDED");
    }

    // ========== FACILITY ENDPOINTS ==========

    @Nested
    @DisplayName("Facility Endpoints")
    class FacilityEndpoints {

        @Test
        @DisplayName("GET /v1/factoring/facility - should return all facilities")
        void listFacilities() throws Exception {
            when(factoringService.getAllFacilities()).thenReturn(List.of(sampleFacility));

            mockMvc.perform(get("/v1/factoring/facility"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].facilityCode").value("FF-TEST00001"))
                    .andExpect(jsonPath("$.data[0].facilityType").value("RECOURSE"))
                    .andExpect(jsonPath("$.data[0].facilityLimit").value(10000000))
                    .andExpect(jsonPath("$.data[0].status").value("APPROVED"));

            verify(factoringService).getAllFacilities();
        }

        @Test
        @DisplayName("GET /v1/factoring/facility - should return empty list")
        void listFacilities_Empty() throws Exception {
            when(factoringService.getAllFacilities()).thenReturn(List.of());

            mockMvc.perform(get("/v1/factoring/facility"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("GET /v1/factoring/facility - should return multiple facilities")
        void listFacilities_Multiple() throws Exception {
            FactoringFacility second = new FactoringFacility();
            second.setId(2L);
            second.setFacilityCode("FF-TEST00002");
            second.setFacilityType("NON_RECOURSE");
            second.setFacilityLimit(new BigDecimal("5000000"));
            second.setUtilizedAmount(new BigDecimal("1000000"));
            second.setAvailableAmount(new BigDecimal("4000000"));
            second.setStatus("APPROVED");

            when(factoringService.getAllFacilities()).thenReturn(List.of(sampleFacility, second));

            mockMvc.perform(get("/v1/factoring/facility"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[1].facilityCode").value("FF-TEST00002"))
                    .andExpect(jsonPath("$.data[1].facilityType").value("NON_RECOURSE"));
        }

        @Test
        @DisplayName("POST /v1/factoring/facility - should create a new facility")
        void createFacility() throws Exception {
            when(factoringService.createFacility(any(FactoringFacility.class))).thenReturn(sampleFacility);

            FactoringFacility request = new FactoringFacility();
            request.setFacilityType("RECOURSE");
            request.setSellerCustomerId(10L);
            request.setSellerName("Seller Corp");
            request.setCurrency("USD");
            request.setFacilityLimit(new BigDecimal("10000000"));
            request.setAdvanceRatePct(new BigDecimal("85.00"));
            request.setDiscountRatePct(new BigDecimal("8.0000"));
            request.setServiceFeeRatePct(new BigDecimal("0.5000"));
            request.setCollectionPeriodDays(60);

            mockMvc.perform(post("/v1/factoring/facility")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.facilityCode").value("FF-TEST00001"))
                    .andExpect(jsonPath("$.data.facilityLimit").value(10000000))
                    .andExpect(jsonPath("$.data.status").value("APPROVED"));

            verify(factoringService).createFacility(any(FactoringFacility.class));
        }

        @Test
        @DisplayName("POST /v1/factoring/facility - should create non-recourse facility")
        void createFacility_NonRecourse() throws Exception {
            FactoringFacility nonRecourse = new FactoringFacility();
            nonRecourse.setId(2L);
            nonRecourse.setFacilityCode("FF-NR0000001");
            nonRecourse.setFacilityType("NON_RECOURSE");
            nonRecourse.setFacilityLimit(new BigDecimal("5000000"));
            nonRecourse.setUtilizedAmount(BigDecimal.ZERO);
            nonRecourse.setAvailableAmount(new BigDecimal("5000000"));
            nonRecourse.setStatus("APPROVED");

            when(factoringService.createFacility(any(FactoringFacility.class))).thenReturn(nonRecourse);

            FactoringFacility request = new FactoringFacility();
            request.setFacilityType("NON_RECOURSE");
            request.setFacilityLimit(new BigDecimal("5000000"));

            mockMvc.perform(post("/v1/factoring/facility")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.facilityType").value("NON_RECOURSE"));
        }
    }

    // ========== INVOICE ENDPOINTS ==========

    @Nested
    @DisplayName("Invoice Endpoints")
    class InvoiceEndpoints {

        @Test
        @DisplayName("GET /v1/factoring/invoice - should return all invoices")
        void listInvoices() throws Exception {
            when(factoringService.getAllTransactions()).thenReturn(List.of(sampleTransaction));

            mockMvc.perform(get("/v1/factoring/invoice"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].invoiceRef").value("INV-001"))
                    .andExpect(jsonPath("$.data[0].invoiceAmount").value(1000000))
                    .andExpect(jsonPath("$.data[0].status").value("SUBMITTED"));

            verify(factoringService).getAllTransactions();
        }

        @Test
        @DisplayName("GET /v1/factoring/invoice - should return empty list")
        void listInvoices_Empty() throws Exception {
            when(factoringService.getAllTransactions()).thenReturn(List.of());

            mockMvc.perform(get("/v1/factoring/invoice"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("POST /v1/factoring/invoice - should submit a new invoice")
        void submitInvoice() throws Exception {
            when(factoringService.submitInvoice(any(FactoringTransaction.class))).thenReturn(sampleTransaction);

            FactoringTransaction request = new FactoringTransaction();
            request.setFacilityId(1L);
            request.setInvoiceRef("INV-001");
            request.setInvoiceDate(LocalDate.now());
            request.setInvoiceAmount(new BigDecimal("1000000"));
            request.setBuyerName("Buyer Corp");
            request.setBuyerId(20L);

            mockMvc.perform(post("/v1/factoring/invoice")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.invoiceRef").value("INV-001"))
                    .andExpect(jsonPath("$.data.invoiceAmount").value(1000000))
                    .andExpect(jsonPath("$.data.status").value("SUBMITTED"));

            verify(factoringService).submitInvoice(any(FactoringTransaction.class));
        }

        @Test
        @DisplayName("POST /v1/factoring/invoice - should submit invoice with minimal fields")
        void submitInvoice_Minimal() throws Exception {
            FactoringTransaction minimal = new FactoringTransaction();
            minimal.setId(2L);
            minimal.setFacilityId(1L);
            minimal.setInvoiceRef("INV-002");
            minimal.setInvoiceAmount(new BigDecimal("500000"));
            minimal.setStatus("SUBMITTED");

            when(factoringService.submitInvoice(any(FactoringTransaction.class))).thenReturn(minimal);

            String json = "{\"facilityId\":1,\"invoiceRef\":\"INV-002\",\"invoiceAmount\":500000}";

            mockMvc.perform(post("/v1/factoring/invoice")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.invoiceRef").value("INV-002"))
                    .andExpect(jsonPath("$.data.status").value("SUBMITTED"));
        }
    }

    // ========== FUND ENDPOINT ==========

    @Nested
    @DisplayName("Fund Endpoint")
    class FundEndpoint {

        @Test
        @DisplayName("POST /v1/factoring/invoice/{id}/fund - should fund an invoice")
        void fundInvoice() throws Exception {
            when(factoringService.approveAndFund(1L)).thenReturn(fundedTransaction);

            mockMvc.perform(post("/v1/factoring/invoice/1/fund"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("FUNDED"))
                    .andExpect(jsonPath("$.data.advanceAmount").value(850000.0000))
                    .andExpect(jsonPath("$.data.discountAmount").isNumber())
                    .andExpect(jsonPath("$.data.netProceedsToSeller").isNumber())
                    .andExpect(jsonPath("$.data.serviceFeeCharged").isNumber())
                    .andExpect(jsonPath("$.data.collectionDueDate").isNotEmpty());

            verify(factoringService).approveAndFund(1L);
        }

        @Test
        @DisplayName("POST /v1/factoring/invoice/{id}/fund - should fund different invoice")
        void fundInvoice_DifferentId() throws Exception {
            FactoringTransaction funded2 = new FactoringTransaction();
            funded2.setId(2L);
            funded2.setFacilityId(1L);
            funded2.setInvoiceRef("INV-002");
            funded2.setAdvanceAmount(new BigDecimal("400000.0000"));
            funded2.setStatus("FUNDED");

            when(factoringService.approveAndFund(2L)).thenReturn(funded2);

            mockMvc.perform(post("/v1/factoring/invoice/2/fund"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("FUNDED"))
                    .andExpect(jsonPath("$.data.advanceAmount").value(400000.0000));

            verify(factoringService).approveAndFund(2L);
        }
    }

    // ========== COLLECT ENDPOINT ==========

    @Nested
    @DisplayName("Collect Endpoint")
    class CollectEndpoint {

        @Test
        @DisplayName("POST /v1/factoring/invoice/{id}/collect - should record full collection")
        void collectInvoice_Full() throws Exception {
            FactoringTransaction collected = new FactoringTransaction();
            collected.setId(1L);
            collected.setInvoiceRef("INV-001");
            collected.setInvoiceAmount(new BigDecimal("1000000"));
            collected.setAdvanceAmount(new BigDecimal("850000.0000"));
            collected.setCollectedAmount(new BigDecimal("1000000"));
            collected.setActualCollectionDate(LocalDate.now());
            collected.setStatus("COLLECTED");

            when(factoringService.recordCollection(eq(1L), any(BigDecimal.class))).thenReturn(collected);

            mockMvc.perform(post("/v1/factoring/invoice/1/collect")
                            .param("amount", "1000000"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("COLLECTED"))
                    .andExpect(jsonPath("$.data.collectedAmount").value(1000000));

            verify(factoringService).recordCollection(eq(1L), any(BigDecimal.class));
        }

        @Test
        @DisplayName("POST /v1/factoring/invoice/{id}/collect - should record partial collection")
        void collectInvoice_Partial() throws Exception {
            FactoringTransaction partial = new FactoringTransaction();
            partial.setId(1L);
            partial.setInvoiceRef("INV-001");
            partial.setInvoiceAmount(new BigDecimal("1000000"));
            partial.setCollectedAmount(new BigDecimal("600000"));
            partial.setStatus("PARTIALLY_COLLECTED");

            when(factoringService.recordCollection(eq(1L), any(BigDecimal.class))).thenReturn(partial);

            mockMvc.perform(post("/v1/factoring/invoice/1/collect")
                            .param("amount", "600000"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("PARTIALLY_COLLECTED"))
                    .andExpect(jsonPath("$.data.collectedAmount").value(600000));
        }
    }

    // ========== RECOURSE ENDPOINT ==========

    @Nested
    @DisplayName("Recourse Endpoint")
    class RecourseEndpoint {

        @Test
        @DisplayName("POST /v1/factoring/invoice/{id}/recourse - should exercise recourse")
        void exerciseRecourse() throws Exception {
            FactoringTransaction recourse = new FactoringTransaction();
            recourse.setId(1L);
            recourse.setInvoiceRef("INV-001");
            recourse.setRecourseExercised(true);
            recourse.setRecourseAmount(new BigDecimal("850000"));
            recourse.setStatus("RECOURSE");

            when(factoringService.exerciseRecourse(eq(1L), any(BigDecimal.class))).thenReturn(recourse);

            mockMvc.perform(post("/v1/factoring/invoice/1/recourse")
                            .param("amount", "850000"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("RECOURSE"))
                    .andExpect(jsonPath("$.data.recourseExercised").value(true))
                    .andExpect(jsonPath("$.data.recourseAmount").value(850000));

            verify(factoringService).exerciseRecourse(eq(1L), any(BigDecimal.class));
        }

        @Test
        @DisplayName("POST /v1/factoring/invoice/{id}/recourse - partial recourse amount")
        void exerciseRecourse_Partial() throws Exception {
            FactoringTransaction recourse = new FactoringTransaction();
            recourse.setId(1L);
            recourse.setInvoiceRef("INV-001");
            recourse.setRecourseExercised(true);
            recourse.setRecourseAmount(new BigDecimal("200000"));
            recourse.setStatus("RECOURSE");

            when(factoringService.exerciseRecourse(eq(1L), any(BigDecimal.class))).thenReturn(recourse);

            mockMvc.perform(post("/v1/factoring/invoice/1/recourse")
                            .param("amount", "200000"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.recourseAmount").value(200000))
                    .andExpect(jsonPath("$.data.recourseExercised").value(true));
        }
    }

    // ========== CONCENTRATION ENDPOINT ==========

    @Nested
    @DisplayName("Concentration Report Endpoint")
    class ConcentrationEndpoint {

        @Test
        @DisplayName("GET /v1/factoring/facility/{code}/concentration - should return concentration report")
        void getConcentrationReport() throws Exception {
            when(factoringService.getFacilityByCode("FF-TEST00001")).thenReturn(sampleFacility);
            when(factoringService.getConcentrationReport(1L)).thenReturn(Map.of(
                    "Buyer Corp", new BigDecimal("60.00"),
                    "Buyer Ltd", new BigDecimal("40.00")
            ));

            mockMvc.perform(get("/v1/factoring/facility/FF-TEST00001/concentration"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.['Buyer Corp']").value(60.00))
                    .andExpect(jsonPath("$.data.['Buyer Ltd']").value(40.00));

            verify(factoringService).getFacilityByCode("FF-TEST00001");
            verify(factoringService).getConcentrationReport(1L);
        }

        @Test
        @DisplayName("GET /v1/factoring/facility/{code}/concentration - empty when no funded invoices")
        void getConcentrationReport_Empty() throws Exception {
            when(factoringService.getFacilityByCode("FF-TEST00001")).thenReturn(sampleFacility);
            when(factoringService.getConcentrationReport(1L)).thenReturn(Map.of());

            mockMvc.perform(get("/v1/factoring/facility/FF-TEST00001/concentration"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isEmpty());
        }

        @Test
        @DisplayName("GET /v1/factoring/facility/{code}/concentration - single buyer 100%")
        void getConcentrationReport_SingleBuyer() throws Exception {
            when(factoringService.getFacilityByCode("FF-TEST00001")).thenReturn(sampleFacility);
            when(factoringService.getConcentrationReport(1L)).thenReturn(Map.of(
                    "Single Buyer", new BigDecimal("100.00")
            ));

            mockMvc.perform(get("/v1/factoring/facility/FF-TEST00001/concentration"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.['Single Buyer']").value(100.00));
        }
    }
}
