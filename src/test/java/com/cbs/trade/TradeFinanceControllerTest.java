package com.cbs.trade;

import com.cbs.trade.controller.TradeFinanceController;
import com.cbs.trade.entity.*;
import com.cbs.trade.repository.LcAmendmentRepository;
import com.cbs.trade.repository.LcDocumentPresentationRepository;
import com.cbs.trade.service.TradeFinanceService;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import com.cbs.common.exception.GlobalExceptionHandler;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TradeFinanceControllerTest {

    private MockMvc mockMvc;

    @Mock
    private TradeFinanceService tradeService;

    @Mock
    private LcAmendmentRepository lcAmendmentRepository;

    @Mock
    private LcDocumentPresentationRepository lcDocPresentationRepository;

    @InjectMocks
    private TradeFinanceController controller;

    private ObjectMapper objectMapper;

    private LetterOfCredit sampleLC;
    private BankGuarantee sampleBG;
    private DocumentaryCollection sampleDC;
    private SupplyChainProgramme sampleProgramme;
    private ScfInvoice sampleInvoice;
    private TradeDocument sampleDocument;
    private LcAmendment sampleAmendment;
    private LcDocumentPresentation samplePresentation;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();

        sampleLC = LetterOfCredit.builder()
                .id(1L).lcNumber("LC000000000001").lcType(LcType.IMPORT_LC)
                .beneficiaryName("Supplier Co").amount(new BigDecimal("500000"))
                .currencyCode("USD").expiryDate(LocalDate.now().plusMonths(6))
                .goodsDescription("Electronic components")
                .utilizedAmount(BigDecimal.ZERO).status(LcStatus.ISSUED)
                .build();

        sampleBG = BankGuarantee.builder()
                .id(1L).guaranteeNumber("BG000000000001").guaranteeType(GuaranteeType.PERFORMANCE)
                .beneficiaryName("Project Owner").amount(new BigDecimal("250000"))
                .currencyCode("USD").expiryDate(LocalDate.now().plusYears(1))
                .purpose("Construction project performance")
                .claimedAmount(BigDecimal.ZERO).status(GuaranteeStatus.ISSUED)
                .build();

        sampleDC = DocumentaryCollection.builder()
                .id(1L).collectionNumber("DC000000000001").collectionType("DP")
                .collectionRole("REMITTING").draweeName("Buyer Co")
                .amount(new BigDecimal("100000")).currencyCode("USD")
                .status("RECEIVED").paidAmount(BigDecimal.ZERO)
                .build();

        sampleProgramme = SupplyChainProgramme.builder()
                .id(1L).programmeCode("SCF00000001").programmeName("Test Programme")
                .programmeType(ScfProgrammeType.APPROVED_PAYABLES)
                .programmeLimit(new BigDecimal("5000000"))
                .utilizedAmount(BigDecimal.ZERO).availableAmount(new BigDecimal("5000000"))
                .currencyCode("USD").discountRate(new BigDecimal("8.00"))
                .expiryDate(LocalDate.now().plusYears(1)).status("ACTIVE")
                .build();

        sampleInvoice = ScfInvoice.builder()
                .id(1L).invoiceNumber("INV-2026-001")
                .invoiceAmount(new BigDecimal("100000")).currencyCode("USD")
                .invoiceDate(LocalDate.now()).dueDate(LocalDate.now().plusDays(90))
                .financedAmount(new BigDecimal("100000"))
                .discountAmount(new BigDecimal("1973")).netPayment(new BigDecimal("98027"))
                .status("FINANCED").build();

        sampleDocument = TradeDocument.builder()
                .id(1L).documentRef("TDOC000000001")
                .documentCategory(TradeDocCategory.INVOICE)
                .lcId(1L).fileName("invoice.pdf").fileType("application/pdf")
                .storagePath("/docs/invoice.pdf").fileSizeBytes(102400L)
                .verificationStatus("PENDING").extractionStatus("PENDING")
                .build();

        sampleAmendment = LcAmendment.builder()
                .id(1L).lcId(1L).amendmentNumber(1)
                .amendmentType("AMOUNT_INCREASE").description("Increase LC amount by 50,000")
                .oldValue("500000").newValue("550000")
                .status("PENDING").requestedBy("officer1")
                .build();

        samplePresentation = LcDocumentPresentation.builder()
                .id(1L).lcId(1L).presentationNumber(1)
                .presentedDate(LocalDate.now())
                .documentsPresented(List.of("Invoice", "Bill of Lading"))
                .amountClaimed(new BigDecimal("200000"))
                .examinationStatus("PENDING")
                .build();
    }

    // ========== LETTERS OF CREDIT ==========

    @Nested
    @DisplayName("LC Endpoints")
    class LcEndpoints {

        @Test
        @DisplayName("GET /v1/trade/lc - should return paginated list of LCs")
        void listLCs() throws Exception {
            when(tradeService.getAllLCs(any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(sampleLC), PageRequest.of(0, 20), 1));

            mockMvc.perform(get("/v1/trade/lc").param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].lcNumber").value("LC000000000001"))
                    .andExpect(jsonPath("$.data[0].status").value("ISSUED"));

            verify(tradeService).getAllLCs(PageRequest.of(0, 20));
        }

        @Test
        @DisplayName("GET /v1/trade/lc - should use default pagination")
        void listLCs_DefaultPagination() throws Exception {
            when(tradeService.getAllLCs(any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

            mockMvc.perform(get("/v1/trade/lc"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(0)));

            verify(tradeService).getAllLCs(PageRequest.of(0, 20));
        }

        @Test
        @DisplayName("POST /v1/trade/lc - should issue a new LC")
        void issueLC() throws Exception {
            when(tradeService.issueLC(eq(1L), eq(LcType.IMPORT_LC), eq("Supplier Co"),
                    any(BigDecimal.class), eq("USD"), any(LocalDate.class),
                    eq("Electronic components"), anyList(), eq("SIGHT"),
                    isNull(), eq(10L), any(BigDecimal.class), any(BigDecimal.class)))
                    .thenReturn(sampleLC);

            mockMvc.perform(post("/v1/trade/lc")
                            .param("applicantId", "1")
                            .param("lcType", "IMPORT_LC")
                            .param("beneficiaryName", "Supplier Co")
                            .param("amount", "500000")
                            .param("currencyCode", "USD")
                            .param("expiryDate", LocalDate.now().plusMonths(6).toString())
                            .param("goodsDescription", "Electronic components")
                            .param("requiredDocuments", "Invoice", "Bill of Lading")
                            .param("paymentTerms", "SIGHT")
                            .param("marginAccountId", "10")
                            .param("marginPercentage", "100")
                            .param("commissionRate", "0.125"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.lcNumber").value("LC000000000001"))
                    .andExpect(jsonPath("$.data.status").value("ISSUED"));
        }

        @Test
        @DisplayName("POST /v1/trade/lc - should issue LC with minimal params")
        void issueLC_MinimalParams() throws Exception {
            when(tradeService.issueLC(eq(1L), eq(LcType.EXPORT_LC), eq("Buyer Ltd"),
                    any(BigDecimal.class), eq("EUR"), any(LocalDate.class),
                    eq("Machinery parts"), isNull(), isNull(),
                    isNull(), isNull(), isNull(), isNull()))
                    .thenReturn(sampleLC);

            mockMvc.perform(post("/v1/trade/lc")
                            .param("applicantId", "1")
                            .param("lcType", "EXPORT_LC")
                            .param("beneficiaryName", "Buyer Ltd")
                            .param("amount", "200000")
                            .param("currencyCode", "EUR")
                            .param("expiryDate", LocalDate.now().plusMonths(3).toString())
                            .param("goodsDescription", "Machinery parts"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("GET /v1/trade/lc/{id} - should return LC by ID")
        void getLC() throws Exception {
            when(tradeService.getLC(1L)).thenReturn(sampleLC);

            mockMvc.perform(get("/v1/trade/lc/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(1))
                    .andExpect(jsonPath("$.data.lcNumber").value("LC000000000001"))
                    .andExpect(jsonPath("$.data.amount").value(500000));

            verify(tradeService).getLC(1L);
        }

        @Test
        @DisplayName("GET /v1/trade/lc/customer/{customerId} - should return customer LCs")
        void getCustomerLCs() throws Exception {
            when(tradeService.getCustomerLCs(eq(1L), any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(sampleLC), PageRequest.of(0, 20), 1));

            mockMvc.perform(get("/v1/trade/lc/customer/1")
                            .param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].lcNumber").value("LC000000000001"));

            verify(tradeService).getCustomerLCs(1L, PageRequest.of(0, 20));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{id}/settle - should settle LC presentation")
        void settleLC() throws Exception {
            sampleLC.setUtilizedAmount(new BigDecimal("200000"));
            sampleLC.setStatus(LcStatus.PARTIALLY_UTILIZED);
            when(tradeService.settlePresentation(eq(1L), any(BigDecimal.class)))
                    .thenReturn(sampleLC);

            mockMvc.perform(post("/v1/trade/lc/1/settle")
                            .param("amount", "200000"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("PARTIALLY_UTILIZED"))
                    .andExpect(jsonPath("$.data.utilizedAmount").value(200000));

            verify(tradeService).settlePresentation(eq(1L), any(BigDecimal.class));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/batch/expire - should process expired LCs")
        void expireLCs() throws Exception {
            when(tradeService.processExpiredLCs()).thenReturn(5);

            mockMvc.perform(post("/v1/trade/lc/batch/expire"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.processed").value(5));

            verify(tradeService).processExpiredLCs();
        }

        @Test
        @DisplayName("POST /v1/trade/lc/batch/expire - should return zero when no expired LCs")
        void expireLCs_NoneExpired() throws Exception {
            when(tradeService.processExpiredLCs()).thenReturn(0);

            mockMvc.perform(post("/v1/trade/lc/batch/expire"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.processed").value(0));
        }

        @Test
        @DisplayName("GET /v1/trade-finance/lc - alternative path mapping should work")
        void listLCs_AlternativePath() throws Exception {
            when(tradeService.getAllLCs(any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(sampleLC), PageRequest.of(0, 20), 1));

            mockMvc.perform(get("/v1/trade-finance/lc"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)));
        }
    }

    // ========== BANK GUARANTEES ==========

    @Nested
    @DisplayName("Guarantee Endpoints")
    class GuaranteeEndpoints {

        @Test
        @DisplayName("GET /v1/trade/guarantees - should return paginated guarantees")
        void listGuarantees() throws Exception {
            when(tradeService.getAllGuarantees(any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(sampleBG), PageRequest.of(0, 20), 1));

            mockMvc.perform(get("/v1/trade/guarantees").param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].guaranteeNumber").value("BG000000000001"))
                    .andExpect(jsonPath("$.data[0].status").value("ISSUED"));

            verify(tradeService).getAllGuarantees(PageRequest.of(0, 20));
        }

        @Test
        @DisplayName("GET /v1/trade/guarantees - empty list for no guarantees")
        void listGuarantees_Empty() throws Exception {
            when(tradeService.getAllGuarantees(any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

            mockMvc.perform(get("/v1/trade/guarantees"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("POST /v1/trade/guarantees - should issue a new guarantee")
        void issueGuarantee() throws Exception {
            when(tradeService.issueGuarantee(eq(1L), eq(GuaranteeType.PERFORMANCE),
                    eq("Project Owner"), any(BigDecimal.class), eq("USD"),
                    any(LocalDate.class), eq("Construction project"),
                    eq(true), eq(365), eq(10L),
                    any(BigDecimal.class), any(BigDecimal.class)))
                    .thenReturn(sampleBG);

            mockMvc.perform(post("/v1/trade/guarantees")
                            .param("applicantId", "1")
                            .param("guaranteeType", "PERFORMANCE")
                            .param("beneficiaryName", "Project Owner")
                            .param("amount", "250000")
                            .param("currencyCode", "USD")
                            .param("expiryDate", LocalDate.now().plusYears(1).toString())
                            .param("purpose", "Construction project")
                            .param("autoExtend", "true")
                            .param("extensionPeriodDays", "365")
                            .param("marginAccountId", "10")
                            .param("marginPercentage", "50")
                            .param("commissionRate", "0.50"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.guaranteeNumber").value("BG000000000001"))
                    .andExpect(jsonPath("$.data.status").value("ISSUED"));
        }

        @Test
        @DisplayName("POST /v1/trade/guarantees - should issue guarantee with minimal params")
        void issueGuarantee_MinimalParams() throws Exception {
            when(tradeService.issueGuarantee(eq(2L), eq(GuaranteeType.BID_BOND),
                    eq("Tender Authority"), any(BigDecimal.class), eq("GBP"),
                    any(LocalDate.class), eq("Bid bond for tender"),
                    isNull(), isNull(), isNull(), isNull(), isNull()))
                    .thenReturn(sampleBG);

            mockMvc.perform(post("/v1/trade/guarantees")
                            .param("applicantId", "2")
                            .param("guaranteeType", "BID_BOND")
                            .param("beneficiaryName", "Tender Authority")
                            .param("amount", "50000")
                            .param("currencyCode", "GBP")
                            .param("expiryDate", LocalDate.now().plusMonths(3).toString())
                            .param("purpose", "Bid bond for tender"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("GET /v1/trade/guarantees/{id} - should return guarantee by ID")
        void getGuarantee() throws Exception {
            when(tradeService.getGuarantee(1L)).thenReturn(sampleBG);

            mockMvc.perform(get("/v1/trade/guarantees/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(1))
                    .andExpect(jsonPath("$.data.guaranteeNumber").value("BG000000000001"))
                    .andExpect(jsonPath("$.data.amount").value(250000));

            verify(tradeService).getGuarantee(1L);
        }

        @Test
        @DisplayName("GET /v1/trade/guarantees/customer/{customerId} - should return customer guarantees")
        void getCustomerGuarantees() throws Exception {
            when(tradeService.getCustomerGuarantees(eq(1L), any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(sampleBG), PageRequest.of(0, 20), 1));

            mockMvc.perform(get("/v1/trade/guarantees/customer/1")
                            .param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].guaranteeNumber").value("BG000000000001"));

            verify(tradeService).getCustomerGuarantees(1L, PageRequest.of(0, 20));
        }

        @Test
        @DisplayName("POST /v1/trade/guarantees/{id}/claim - should process guarantee claim")
        void claimGuarantee() throws Exception {
            sampleBG.setClaimedAmount(new BigDecimal("100000"));
            sampleBG.setStatus(GuaranteeStatus.PARTIALLY_CLAIMED);
            when(tradeService.processGuaranteeClaim(eq(1L), any(BigDecimal.class)))
                    .thenReturn(sampleBG);

            mockMvc.perform(post("/v1/trade/guarantees/1/claim")
                            .param("amount", "100000"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.claimedAmount").value(100000))
                    .andExpect(jsonPath("$.data.status").value("PARTIALLY_CLAIMED"));

            verify(tradeService).processGuaranteeClaim(eq(1L), any(BigDecimal.class));
        }

        @Test
        @DisplayName("POST /v1/trade/guarantees/batch/expire - should process expired guarantees")
        void processGuaranteeExpiry() throws Exception {
            when(tradeService.processExpiredGuarantees()).thenReturn(3);

            mockMvc.perform(post("/v1/trade/guarantees/batch/expire"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.processed").value(3));

            verify(tradeService).processExpiredGuarantees();
        }

        @Test
        @DisplayName("POST /v1/trade/guarantees/batch/expire - zero expired")
        void processGuaranteeExpiry_NoneExpired() throws Exception {
            when(tradeService.processExpiredGuarantees()).thenReturn(0);

            mockMvc.perform(post("/v1/trade/guarantees/batch/expire"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.processed").value(0));
        }
    }

    // ========== DOCUMENTARY COLLECTIONS ==========

    @Nested
    @DisplayName("Collection Endpoints")
    class CollectionEndpoints {

        @Test
        @DisplayName("GET /v1/trade/collections - should return paginated collections")
        void listCollections() throws Exception {
            when(tradeService.getAllCollections(any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(sampleDC), PageRequest.of(0, 20), 1));

            mockMvc.perform(get("/v1/trade/collections").param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].collectionNumber").value("DC000000000001"))
                    .andExpect(jsonPath("$.data[0].collectionType").value("DP"));

            verify(tradeService).getAllCollections(PageRequest.of(0, 20));
        }

        @Test
        @DisplayName("POST /v1/trade/collections - should create a documentary collection")
        void createCollection() throws Exception {
            when(tradeService.createCollection(eq(1L), eq("DP"), eq("Buyer Co"),
                    any(BigDecimal.class), eq("USD"), anyList(), isNull()))
                    .thenReturn(sampleDC);

            mockMvc.perform(post("/v1/trade/collections")
                            .param("drawerCustomerId", "1")
                            .param("collectionType", "DP")
                            .param("draweeName", "Buyer Co")
                            .param("amount", "100000")
                            .param("currencyCode", "USD")
                            .param("documents", "Invoice", "Bill of Lading"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.collectionNumber").value("DC000000000001"));
        }

        @Test
        @DisplayName("POST /v1/trade/collections - should create DA collection with tenor")
        void createCollection_DA_WithTenor() throws Exception {
            DocumentaryCollection daDC = DocumentaryCollection.builder()
                    .id(2L).collectionNumber("DC000000000002").collectionType("DA")
                    .collectionRole("REMITTING").draweeName("Importer Ltd")
                    .amount(new BigDecimal("200000")).currencyCode("EUR")
                    .tenorDays(60).status("RECEIVED").paidAmount(BigDecimal.ZERO)
                    .build();
            when(tradeService.createCollection(eq(2L), eq("DA"), eq("Importer Ltd"),
                    any(BigDecimal.class), eq("EUR"), isNull(), eq(60)))
                    .thenReturn(daDC);

            mockMvc.perform(post("/v1/trade/collections")
                            .param("drawerCustomerId", "2")
                            .param("collectionType", "DA")
                            .param("draweeName", "Importer Ltd")
                            .param("amount", "200000")
                            .param("currencyCode", "EUR")
                            .param("tenorDays", "60"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.collectionType").value("DA"))
                    .andExpect(jsonPath("$.data.tenorDays").value(60));
        }

        @Test
        @DisplayName("POST /v1/trade/collections/{id}/settle - should settle collection")
        void settleCollection() throws Exception {
            sampleDC.setPaidAmount(new BigDecimal("100000"));
            sampleDC.setStatus("PAID");
            when(tradeService.settleCollection(eq(1L), any(BigDecimal.class)))
                    .thenReturn(sampleDC);

            mockMvc.perform(post("/v1/trade/collections/1/settle")
                            .param("amount", "100000"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.paidAmount").value(100000))
                    .andExpect(jsonPath("$.data.status").value("PAID"));

            verify(tradeService).settleCollection(eq(1L), any(BigDecimal.class));
        }
    }

    // ========== SUPPLY CHAIN FINANCE ==========

    @Nested
    @DisplayName("SCF Endpoints")
    class ScfEndpoints {

        @Test
        @DisplayName("GET /v1/trade/scf/programmes - should return all programmes")
        void listProgrammes() throws Exception {
            when(tradeService.getAllProgrammes()).thenReturn(List.of(sampleProgramme));

            mockMvc.perform(get("/v1/trade/scf/programmes"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].programmeCode").value("SCF00000001"))
                    .andExpect(jsonPath("$.data[0].status").value("ACTIVE"));

            verify(tradeService).getAllProgrammes();
        }

        @Test
        @DisplayName("GET /v1/trade/scf/programmes - should return empty list")
        void listProgrammes_Empty() throws Exception {
            when(tradeService.getAllProgrammes()).thenReturn(List.of());

            mockMvc.perform(get("/v1/trade/scf/programmes"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("POST /v1/trade/scf/programmes - should create a new SCF programme")
        void createProgramme() throws Exception {
            when(tradeService.createScfProgramme(eq(1L), eq(ScfProgrammeType.APPROVED_PAYABLES),
                    eq("Test Programme"), any(BigDecimal.class), eq("USD"),
                    any(LocalDate.class), any(BigDecimal.class)))
                    .thenReturn(sampleProgramme);

            mockMvc.perform(post("/v1/trade/scf/programmes")
                            .param("anchorCustomerId", "1")
                            .param("type", "APPROVED_PAYABLES")
                            .param("programmeName", "Test Programme")
                            .param("limit", "5000000")
                            .param("currencyCode", "USD")
                            .param("expiryDate", LocalDate.now().plusYears(1).toString())
                            .param("discountRate", "8.00"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.programmeCode").value("SCF00000001"))
                    .andExpect(jsonPath("$.data.programmeLimit").value(5000000));
        }

        @Test
        @DisplayName("POST /v1/trade/scf/programmes - should create programme without discount rate")
        void createProgramme_NoDiscountRate() throws Exception {
            when(tradeService.createScfProgramme(eq(1L), eq(ScfProgrammeType.RECEIVABLES_DISCOUNT),
                    eq("Receivables Programme"), any(BigDecimal.class), eq("GBP"),
                    any(LocalDate.class), isNull()))
                    .thenReturn(sampleProgramme);

            mockMvc.perform(post("/v1/trade/scf/programmes")
                            .param("anchorCustomerId", "1")
                            .param("type", "RECEIVABLES_DISCOUNT")
                            .param("programmeName", "Receivables Programme")
                            .param("limit", "3000000")
                            .param("currencyCode", "GBP")
                            .param("expiryDate", LocalDate.now().plusYears(2).toString()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("GET /v1/trade/scf/invoices - should return paginated invoices")
        void listInvoices() throws Exception {
            when(tradeService.getAllInvoices(any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(sampleInvoice), PageRequest.of(0, 20), 1));

            mockMvc.perform(get("/v1/trade/scf/invoices").param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].invoiceNumber").value("INV-2026-001"))
                    .andExpect(jsonPath("$.data[0].status").value("FINANCED"));

            verify(tradeService).getAllInvoices(PageRequest.of(0, 20));
        }

        @Test
        @DisplayName("POST /v1/trade/scf/invoices - should finance an invoice")
        void financeInvoice() throws Exception {
            when(tradeService.financeInvoice(eq(1L), eq("INV-2026-001"),
                    eq(2L), eq(3L), any(BigDecimal.class), eq("USD"),
                    any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(sampleInvoice);

            mockMvc.perform(post("/v1/trade/scf/invoices")
                            .param("programmeId", "1")
                            .param("invoiceNumber", "INV-2026-001")
                            .param("sellerId", "2")
                            .param("buyerId", "3")
                            .param("invoiceAmount", "100000")
                            .param("currencyCode", "USD")
                            .param("invoiceDate", LocalDate.now().toString())
                            .param("dueDate", LocalDate.now().plusDays(90).toString()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.invoiceNumber").value("INV-2026-001"))
                    .andExpect(jsonPath("$.data.financedAmount").value(100000))
                    .andExpect(jsonPath("$.data.status").value("FINANCED"));
        }

        @Test
        @DisplayName("POST /v1/trade/scf/invoices - should finance invoice without optional seller/buyer")
        void financeInvoice_MinimalParams() throws Exception {
            when(tradeService.financeInvoice(eq(1L), eq("INV-2026-002"),
                    isNull(), isNull(), any(BigDecimal.class), eq("USD"),
                    any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(sampleInvoice);

            mockMvc.perform(post("/v1/trade/scf/invoices")
                            .param("programmeId", "1")
                            .param("invoiceNumber", "INV-2026-002")
                            .param("invoiceAmount", "50000")
                            .param("currencyCode", "USD")
                            .param("invoiceDate", LocalDate.now().toString())
                            .param("dueDate", LocalDate.now().plusDays(60).toString()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    // ========== TRADE DOCUMENTS ==========

    @Nested
    @DisplayName("Document Endpoints")
    class DocumentEndpoints {

        @Test
        @DisplayName("GET /v1/trade/documents - should return all trade documents")
        void listDocuments() throws Exception {
            when(tradeService.getAllTradeDocuments()).thenReturn(List.of(sampleDocument));

            mockMvc.perform(get("/v1/trade/documents"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].documentRef").value("TDOC000000001"))
                    .andExpect(jsonPath("$.data[0].documentCategory").value("INVOICE"));

            verify(tradeService).getAllTradeDocuments();
        }

        @Test
        @DisplayName("POST /v1/trade/documents - should upload a trade document")
        void uploadDocument() throws Exception {
            when(tradeService.uploadTradeDocument(eq(TradeDocCategory.BILL_OF_LADING),
                    eq(1L), isNull(), eq(5L), eq("bol.pdf"),
                    eq("application/pdf"), eq("/docs/bol.pdf"), eq(204800L)))
                    .thenReturn(sampleDocument);

            mockMvc.perform(post("/v1/trade/documents")
                            .param("category", "BILL_OF_LADING")
                            .param("lcId", "1")
                            .param("customerId", "5")
                            .param("fileName", "bol.pdf")
                            .param("fileType", "application/pdf")
                            .param("storagePath", "/docs/bol.pdf")
                            .param("fileSizeBytes", "204800"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.documentRef").value("TDOC000000001"));
        }

        @Test
        @DisplayName("POST /v1/trade/documents - upload with minimal params")
        void uploadDocument_MinimalParams() throws Exception {
            when(tradeService.uploadTradeDocument(eq(TradeDocCategory.INVOICE),
                    isNull(), isNull(), isNull(), eq("invoice.pdf"),
                    eq("application/pdf"), eq("/docs/invoice.pdf"), isNull()))
                    .thenReturn(sampleDocument);

            mockMvc.perform(post("/v1/trade/documents")
                            .param("category", "INVOICE")
                            .param("fileName", "invoice.pdf")
                            .param("fileType", "application/pdf")
                            .param("storagePath", "/docs/invoice.pdf"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("POST /v1/trade/documents/{id}/verify - should verify document as compliant")
        void verifyDocument_Compliant() throws Exception {
            sampleDocument.setVerificationStatus("COMPLIANT");
            sampleDocument.setVerifiedBy("officer1");
            when(tradeService.verifyTradeDocument(eq(1L), eq("officer1"), eq(true), eq("All checks passed")))
                    .thenReturn(sampleDocument);

            mockMvc.perform(post("/v1/trade/documents/1/verify")
                            .param("verifiedBy", "officer1")
                            .param("compliant", "true")
                            .param("notes", "All checks passed"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.verificationStatus").value("COMPLIANT"))
                    .andExpect(jsonPath("$.data.verifiedBy").value("officer1"));
        }

        @Test
        @DisplayName("POST /v1/trade/documents/{id}/verify - should mark document as non-compliant")
        void verifyDocument_NonCompliant() throws Exception {
            sampleDocument.setVerificationStatus("DISCREPANT");
            sampleDocument.setVerifiedBy("officer2");
            sampleDocument.setDiscrepancyNotes("Amount mismatch");
            when(tradeService.verifyTradeDocument(eq(1L), eq("officer2"), eq(false), eq("Amount mismatch")))
                    .thenReturn(sampleDocument);

            mockMvc.perform(post("/v1/trade/documents/1/verify")
                            .param("verifiedBy", "officer2")
                            .param("compliant", "false")
                            .param("notes", "Amount mismatch"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.verificationStatus").value("DISCREPANT"));
        }

        @Test
        @DisplayName("POST /v1/trade/documents/{id}/verify - verify without notes")
        void verifyDocument_NoNotes() throws Exception {
            sampleDocument.setVerificationStatus("COMPLIANT");
            when(tradeService.verifyTradeDocument(eq(1L), eq("officer1"), eq(true), isNull()))
                    .thenReturn(sampleDocument);

            mockMvc.perform(post("/v1/trade/documents/1/verify")
                            .param("verifiedBy", "officer1")
                            .param("compliant", "true"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("GET /v1/trade/documents/lc/{lcId} - should return LC documents")
        void getLcDocuments() throws Exception {
            when(tradeService.getLcDocuments(1L)).thenReturn(List.of(sampleDocument));

            mockMvc.perform(get("/v1/trade/documents/lc/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].lcId").value(1));

            verify(tradeService).getLcDocuments(1L);
        }

        @Test
        @DisplayName("GET /v1/trade/documents/lc/{lcId} - should return empty when no docs")
        void getLcDocuments_Empty() throws Exception {
            when(tradeService.getLcDocuments(99L)).thenReturn(List.of());

            mockMvc.perform(get("/v1/trade/documents/lc/99"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }
    }

    // ========== LC AMENDMENTS ==========

    @Nested
    @DisplayName("Amendment Endpoints")
    class AmendmentEndpoints {

        @Test
        @DisplayName("GET /v1/trade/lc/{lcId}/amendments - should list amendments for LC")
        void getLcAmendments() throws Exception {
            when(lcAmendmentRepository.findByLcIdOrderByAmendmentNumberDesc(1L))
                    .thenReturn(List.of(sampleAmendment));

            mockMvc.perform(get("/v1/trade/lc/1/amendments"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].lcId").value(1))
                    .andExpect(jsonPath("$.data[0].amendmentType").value("AMOUNT_INCREASE"))
                    .andExpect(jsonPath("$.data[0].status").value("PENDING"));

            verify(lcAmendmentRepository).findByLcIdOrderByAmendmentNumberDesc(1L);
        }

        @Test
        @DisplayName("GET /v1/trade/lc/{lcId}/amendments - empty when no amendments")
        void getLcAmendments_Empty() throws Exception {
            when(lcAmendmentRepository.findByLcIdOrderByAmendmentNumberDesc(99L))
                    .thenReturn(List.of());

            mockMvc.perform(get("/v1/trade/lc/99/amendments"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{lcId}/amendments - should create LC amendment")
        void createLcAmendment() throws Exception {
            when(lcAmendmentRepository.countByLcId(1L)).thenReturn(0);
            when(lcAmendmentRepository.save(any(LcAmendment.class))).thenAnswer(inv -> {
                LcAmendment a = inv.getArgument(0);
                a.setId(1L);
                return a;
            });

            LcAmendment requestBody = LcAmendment.builder()
                    .amendmentType("AMOUNT_INCREASE")
                    .description("Increase LC amount by 50,000")
                    .oldValue("500000").newValue("550000")
                    .requestedBy("officer1")
                    .build();

            mockMvc.perform(post("/v1/trade/lc/1/amendments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requestBody)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.lcId").value(1))
                    .andExpect(jsonPath("$.data.amendmentNumber").value(1))
                    .andExpect(jsonPath("$.data.status").value("PENDING"));

            verify(lcAmendmentRepository).countByLcId(1L);
            verify(lcAmendmentRepository).save(any(LcAmendment.class));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{lcId}/amendments - should increment amendment number")
        void createLcAmendment_IncrementNumber() throws Exception {
            when(lcAmendmentRepository.countByLcId(1L)).thenReturn(2);
            when(lcAmendmentRepository.save(any(LcAmendment.class))).thenAnswer(inv -> {
                LcAmendment a = inv.getArgument(0);
                a.setId(3L);
                return a;
            });

            LcAmendment requestBody = LcAmendment.builder()
                    .amendmentType("EXPIRY_EXTENSION")
                    .description("Extend expiry by 3 months")
                    .build();

            mockMvc.perform(post("/v1/trade/lc/1/amendments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requestBody)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.amendmentNumber").value(3));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{lcId}/amendments/{amendmentId}/approve - should approve amendment")
        void approveLcAmendment() throws Exception {
            when(lcAmendmentRepository.findById(1L)).thenReturn(Optional.of(sampleAmendment));
            when(lcAmendmentRepository.save(any(LcAmendment.class))).thenAnswer(inv -> inv.getArgument(0));

            mockMvc.perform(post("/v1/trade/lc/1/amendments/1/approve"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("ACCEPTED"));

            verify(lcAmendmentRepository).findById(1L);
            verify(lcAmendmentRepository).save(any(LcAmendment.class));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{lcId}/amendments/{amendmentId}/reject - should reject amendment")
        void rejectLcAmendment() throws Exception {
            when(lcAmendmentRepository.findById(1L)).thenReturn(Optional.of(sampleAmendment));
            when(lcAmendmentRepository.save(any(LcAmendment.class))).thenAnswer(inv -> inv.getArgument(0));

            mockMvc.perform(post("/v1/trade/lc/1/amendments/1/reject"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("REJECTED"));

            verify(lcAmendmentRepository).findById(1L);
            verify(lcAmendmentRepository).save(any(LcAmendment.class));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{lcId}/amendments/{amendmentId}/approve - should throw when not found")
        void approveLcAmendment_NotFound() throws Exception {
            when(lcAmendmentRepository.findById(999L)).thenReturn(Optional.empty());

            mockMvc.perform(post("/v1/trade/lc/1/amendments/999/approve"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{lcId}/amendments/{amendmentId}/reject - should throw when not found")
        void rejectLcAmendment_NotFound() throws Exception {
            when(lcAmendmentRepository.findById(999L)).thenReturn(Optional.empty());

            mockMvc.perform(post("/v1/trade/lc/1/amendments/999/reject"))
                    .andExpect(status().isNotFound());
        }
    }

    // ========== LC DOCUMENT PRESENTATIONS ==========

    @Nested
    @DisplayName("Presentation Endpoints")
    class PresentationEndpoints {

        @Test
        @DisplayName("GET /v1/trade/lc/{lcId}/presentations - should list presentations for LC")
        void getLcPresentations() throws Exception {
            when(lcDocPresentationRepository.findByLcIdOrderByPresentationNumberDesc(1L))
                    .thenReturn(List.of(samplePresentation));

            mockMvc.perform(get("/v1/trade/lc/1/presentations"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].lcId").value(1))
                    .andExpect(jsonPath("$.data[0].presentationNumber").value(1))
                    .andExpect(jsonPath("$.data[0].examinationStatus").value("PENDING"));

            verify(lcDocPresentationRepository).findByLcIdOrderByPresentationNumberDesc(1L);
        }

        @Test
        @DisplayName("GET /v1/trade/lc/{lcId}/presentations - empty when no presentations")
        void getLcPresentations_Empty() throws Exception {
            when(lcDocPresentationRepository.findByLcIdOrderByPresentationNumberDesc(99L))
                    .thenReturn(List.of());

            mockMvc.perform(get("/v1/trade/lc/99/presentations"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{lcId}/presentations - should create a presentation")
        void createLcPresentation() throws Exception {
            when(lcDocPresentationRepository.countByLcId(1L)).thenReturn(0);
            when(lcDocPresentationRepository.save(any(LcDocumentPresentation.class))).thenAnswer(inv -> {
                LcDocumentPresentation p = inv.getArgument(0);
                p.setId(1L);
                return p;
            });

            LcDocumentPresentation requestBody = LcDocumentPresentation.builder()
                    .documentsPresented(List.of("Invoice", "Bill of Lading"))
                    .amountClaimed(new BigDecimal("200000"))
                    .build();

            mockMvc.perform(post("/v1/trade/lc/1/presentations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requestBody)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.lcId").value(1))
                    .andExpect(jsonPath("$.data.presentationNumber").value(1))
                    .andExpect(jsonPath("$.data.examinationStatus").value("PENDING"));

            verify(lcDocPresentationRepository).countByLcId(1L);
            verify(lcDocPresentationRepository).save(any(LcDocumentPresentation.class));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{lcId}/presentations - should increment presentation number")
        void createLcPresentation_IncrementNumber() throws Exception {
            when(lcDocPresentationRepository.countByLcId(1L)).thenReturn(3);
            when(lcDocPresentationRepository.save(any(LcDocumentPresentation.class))).thenAnswer(inv -> {
                LcDocumentPresentation p = inv.getArgument(0);
                p.setId(4L);
                return p;
            });

            LcDocumentPresentation requestBody = LcDocumentPresentation.builder()
                    .documentsPresented(List.of("Invoice"))
                    .amountClaimed(new BigDecimal("50000"))
                    .presentedDate(LocalDate.now())
                    .build();

            mockMvc.perform(post("/v1/trade/lc/1/presentations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requestBody)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.presentationNumber").value(4));
        }

        @Test
        @DisplayName("POST /v1/trade/lc/{lcId}/presentations - should default presentedDate to today")
        void createLcPresentation_DefaultDate() throws Exception {
            when(lcDocPresentationRepository.countByLcId(1L)).thenReturn(0);
            when(lcDocPresentationRepository.save(any(LcDocumentPresentation.class))).thenAnswer(inv -> {
                LcDocumentPresentation p = inv.getArgument(0);
                p.setId(1L);
                return p;
            });

            String json = "{\"documentsPresented\":[\"Invoice\"],\"amountClaimed\":100000}";

            mockMvc.perform(post("/v1/trade/lc/1/presentations")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.presentedDate").isNotEmpty());
        }
    }
}
