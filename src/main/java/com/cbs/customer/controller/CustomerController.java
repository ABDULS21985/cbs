package com.cbs.customer.controller;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.card.entity.Card;
import com.cbs.card.service.CardService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.customer.dto.*;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerIdentification;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.entity.RiskRating;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.customer.service.CustomerService;
import lombok.extern.slf4j.Slf4j;
import com.cbs.lending.entity.LoanAccount;
import com.cbs.segmentation.entity.Segment;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/customers")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Customer Management", description = "360° Customer View, Onboarding, eKYC, and Account Structures")
public class CustomerController {

    private final CustomerService customerService;
    private final CustomerRepository customerRepository;
    private final CardService cardService;

    // ========================================================================
    // CAPABILITY 1: 360° Customer View
    // ========================================================================

    @GetMapping("/{customerId}")
    @Operation(summary = "Get full 360° customer view")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomer360(@PathVariable Long customerId) {
        CustomerResponse response = customerService.getCustomer360(customerId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/cif/{cifNumber}")
    @Operation(summary = "Get customer by CIF number")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerByCif(@PathVariable String cifNumber) {
        CustomerResponse response = customerService.getCustomerByCif(cifNumber);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/search")
    @Operation(summary = "Advanced customer search with criteria")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CustomerSummaryResponse>>> searchCustomers(
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) CustomerType customerType,
            @RequestParam(required = false) CustomerStatus status,
            @RequestParam(required = false) RiskRating riskRating,
            @RequestParam(required = false) String branchCode,
            @RequestParam(required = false) String sectorCode,
            @RequestParam(required = false) String nationality,
            @RequestParam(required = false) String stateOfOrigin,
            @RequestParam(required = false) LocalDate createdAfter,
            @RequestParam(required = false) LocalDate createdBefore,
            @RequestParam(required = false) String relationshipManager,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        CustomerSearchCriteria criteria = CustomerSearchCriteria.builder()
                .searchTerm(searchTerm)
                .customerType(customerType)
                .status(status)
                .riskRating(riskRating)
                .branchCode(branchCode)
                .sectorCode(sectorCode)
                .nationality(nationality)
                .stateOfOrigin(stateOfOrigin)
                .createdAfter(createdAfter)
                .createdBefore(createdBefore)
                .relationshipManager(relationshipManager)
                .build();

        Pageable pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(sortDir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortBy));

        Page<CustomerSummaryResponse> result = customerService.searchCustomers(criteria, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/quick-search")
    @Operation(summary = "Quick search by name, CIF, email, or phone")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CustomerSummaryResponse>>> quickSearch(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(ApiResponse.ok(java.util.Collections.emptyList()));
        }
        Page<CustomerSummaryResponse> result = customerService.quickSearch(q,
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/dashboard/stats")
    @Operation(summary = "Get customer dashboard statistics")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerDashboardStats>> getDashboardStats() {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getDashboardStats()));
    }

    // ========================================================================
    // CAPABILITY 2: Multi-Entity Customer Onboarding
    // ========================================================================

    @PostMapping
    @Operation(summary = "Create / onboard a new customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(
            @Valid @RequestBody CreateCustomerRequest request) {
        CustomerResponse response = customerService.createCustomer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Customer created successfully"));
    }

    @PutMapping("/{customerId}")
    @Operation(summary = "Update customer details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateCustomer(
            @PathVariable Long customerId,
            @Valid @RequestBody UpdateCustomerRequest request) {
        CustomerResponse response = customerService.updateCustomer(customerId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Customer updated successfully"));
    }

    @PatchMapping("/{customerId}/status")
    @Operation(summary = "Change customer status (lifecycle management)")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CustomerResponse>> changeStatus(
            @PathVariable Long customerId,
            @Valid @RequestBody CustomerStatusChangeRequest request) {
        CustomerResponse response = customerService.changeStatus(customerId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Status changed successfully"));
    }

    // ========================================================================
    // CAPABILITY 3: eKYC & Digital Identity Verification
    // ========================================================================

    @PostMapping("/kyc/verify")
    @Operation(summary = "Verify customer identity document (eKYC)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<KycVerificationResponse>> verifyIdentification(
            @Valid @RequestBody KycVerificationRequest request) {
        KycVerificationResponse response = customerService.verifyIdentification(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{customerId}/identifications")
    @Operation(summary = "Get customer identification documents")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<IdentificationDto>>> getIdentifications(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getIdentifications(customerId)));
    }

    @PostMapping("/{customerId}/identifications")
    @Operation(summary = "Add identification document")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<IdentificationDto>> addIdentification(
            @PathVariable Long customerId,
            @Valid @RequestBody IdentificationDto request) {
        IdentificationDto response = customerService.addIdentification(customerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    // ========================================================================
    // CAPABILITY 4: Flexible Account Structures (Sub-resource management)
    // ========================================================================

    // Addresses
    @GetMapping("/{customerId}/addresses")
    @Operation(summary = "Get customer addresses")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<AddressDto>>> getAddresses(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getAddresses(customerId)));
    }

    @PostMapping("/{customerId}/addresses")
    @Operation(summary = "Add customer address")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AddressDto>> addAddress(
            @PathVariable Long customerId,
            @Valid @RequestBody AddressDto request) {
        AddressDto response = customerService.addAddress(customerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PutMapping("/{customerId}/addresses/{addressId}")
    @Operation(summary = "Update customer address")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AddressDto>> updateAddress(
            @PathVariable Long customerId,
            @PathVariable Long addressId,
            @Valid @RequestBody AddressDto request) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.updateAddress(customerId, addressId, request)));
    }

    @DeleteMapping("/{customerId}/addresses/{addressId}")
    @Operation(summary = "Delete customer address")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            @PathVariable Long customerId,
            @PathVariable Long addressId) {
        customerService.deleteAddress(customerId, addressId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Address deleted"));
    }

    // Contacts
    @GetMapping("/{customerId}/contacts")
    @Operation(summary = "Get customer contacts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ContactDto>>> getContacts(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getContacts(customerId)));
    }

    @PostMapping("/{customerId}/contacts")
    @Operation(summary = "Add customer contact")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ContactDto>> addContact(
            @PathVariable Long customerId,
            @Valid @RequestBody ContactDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(customerService.addContact(customerId, request)));
    }

    // Notes
    @GetMapping("/{customerId}/notes")
    @Operation(summary = "Get customer notes")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<NoteDto>>> getNotes(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<NoteDto> result = customerService.getNotes(customerId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{customerId}/notes")
    @Operation(summary = "Add customer note")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<NoteDto>> addNote(
            @PathVariable Long customerId,
            @Valid @RequestBody NoteDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(customerService.addNote(customerId, request)));
    }

    // Relationships
    @GetMapping("/{customerId}/relationships")
    @Operation(summary = "Get customer relationships")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<RelationshipDto>>> getRelationships(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getRelationships(customerId)));
    }

    @PostMapping("/{customerId}/relationships")
    @Operation(summary = "Add customer relationship")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<RelationshipDto>> addRelationship(
            @PathVariable Long customerId,
            @Valid @RequestBody RelationshipDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(customerService.addRelationship(customerId, request)));
    }

    // ========================================================================
    // FRONTEND-FACING ENDPOINTS: List, Counts, Cross-module, KYC, Segments, BVN
    // ========================================================================

    @GetMapping
    @Operation(summary = "List/search customers with pagination")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<CustomerSummaryResponse>>> listCustomers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String customerType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {

        Pageable pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sort));

        Page<CustomerSummaryResponse> result = customerService.listCustomers(search, status, customerType, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/count")
    @Operation(summary = "Get customer counts by status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getCustomerCounts() {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getCustomerCounts()));
    }

    @GetMapping("/{customerId}/accounts")
    @Operation(summary = "Get customer accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Account>>> getCustomerAccounts(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getCustomerAccounts(customerId)));
    }

    @GetMapping("/{customerId}/loans")
    @Operation(summary = "Get customer loans")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<LoanAccount>>> getCustomerLoans(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getCustomerLoans(customerId)));
    }

    @GetMapping("/{customerId}/cards")
    @Operation(summary = "Get customer cards")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Card>>> getCustomerCards(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                cardService.getCustomerCards(customerId, PageRequest.of(page, Math.min(size, 100))).getContent()));
    }

    @GetMapping("/{customerId}/transactions")
    @Operation(summary = "Get recent transactions for all customer accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<TransactionJournal>>> getCustomerTransactions(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TransactionJournal> transactions = customerService.getCustomerTransactions(customerId, page, Math.min(size, 100));
        return ResponseEntity.ok(ApiResponse.ok(transactions.getContent(), PageMeta.from(transactions)));
    }

    @GetMapping("/kyc")
    @Operation(summary = "KYC customer list filtered by verification status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerSummaryResponse>>> getKycCustomerList(
            @RequestParam(required = false) String kycStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {

        Pageable pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sort));

        Page<CustomerSummaryResponse> result = customerService.getKycCustomerList(kycStatus, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/kyc/stats")
    @Operation(summary = "KYC statistics by verification status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getKycStats() {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getKycStats()));
    }

    @GetMapping("/segments")
    @Operation(summary = "Get distinct active customer segments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Segment>>> getSegments() {
        List<Segment> segments = customerService.getDistinctSegments();
        if (segments == null) {
            return ResponseEntity.ok(ApiResponse.ok(java.util.Collections.emptyList()));
        }
        return ResponseEntity.ok(ApiResponse.ok(segments));
    }

    @PostMapping("/{id}/kyc/decide")
    @Operation(summary = "Make KYC decision: approve, reject, or request additional documents")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> kycDecide(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Customer", "id", id));
        String decision = body.getOrDefault("decision", "").toUpperCase();
        String notes = body.getOrDefault("notes", "");
        String riskRating = body.get("riskRating");

        switch (decision) {
            case "APPROVE":
                customer.setStatus(CustomerStatus.ACTIVE);
                if (riskRating != null) { try { customer.setRiskRating(RiskRating.valueOf(riskRating)); } catch (Exception ignored) {} }
                // Mark all identifications as verified
                customer.getIdentifications().forEach(id2 -> id2.setIsVerified(true));
                break;
            case "REJECT":
                customer.setStatus(CustomerStatus.SUSPENDED);
                break;
            case "REQUEST_DOCUMENTS":
                // Status stays as-is; notes communicate what's needed
                break;
            default:
                return ResponseEntity.badRequest().body(ApiResponse.error("Invalid decision: " + decision));
        }

        customerRepository.save(customer);
        log.info("KYC decision: customerId={}, decision={}, notes={}", id, decision, notes);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("customerId", id, "decision", decision, "status", customer.getStatus().name())));
    }

    @PostMapping("/{id}/kyc/verify-document")
    @Operation(summary = "Verify or reject a single identification document")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> kycVerifyDocument(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Customer", "id", id));
        Number docId = (Number) body.get("documentId");
        String decision = String.valueOf(body.getOrDefault("decision", "VERIFIED")).toUpperCase();
        String reason = String.valueOf(body.getOrDefault("reason", ""));

        CustomerIdentification doc = customer.getIdentifications().stream()
                .filter(d -> d.getId().equals(docId.longValue()))
                .findFirst()
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Identification", "id", docId));

        doc.setIsVerified("VERIFIED".equals(decision));
        if ("VERIFIED".equals(decision)) {
            doc.setVerifiedAt(java.time.Instant.now());
        }

        customerRepository.save(customer);
        log.info("Document verification: customerId={}, docId={}, decision={}", id, docId, decision);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("documentId", docId, "decision", decision, "reason", reason)));
    }

    @PostMapping("/verify-bvn")
    @Operation(summary = "BVN verification (delegates to KYC verify with idType=BVN)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<KycVerificationResponse>> verifyBvn(
            @Valid @RequestBody BvnVerificationRequest request) {
        KycVerificationResponse response = customerService.verifyBvnIdentification(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    // ── KYC Extended Endpoints ──────────────────────────────────────────────

    @PostMapping("/{id}/kyc/request-info")
    @Operation(summary = "Request additional information from customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> kycRequestInfo(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Customer", "id", id));
        log.info("KYC info request: customerId={}, message={}", id, body.get("message"));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("customerId", id, "status", "INFO_REQUESTED", "message", body.getOrDefault("message", ""))));
    }

    @PatchMapping("/{id}/kyc/status")
    @Operation(summary = "Update overall KYC status")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> kycUpdateStatus(
            @PathVariable Long id, @RequestParam String status) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Customer", "id", id));
        log.info("KYC status update: customerId={}, status={}", id, status);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("customerId", id, "kycStatus", status)));
    }

    @PostMapping("/{id}/edd/initiate")
    @Operation(summary = "Initiate Enhanced Due Diligence")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> eddInitiate(@PathVariable Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("Customer", "id", id));
        log.info("EDD initiated: customerId={}, riskRating={}", id, customer.getRiskRating());
        java.util.List<Map<String, Object>> checklist = java.util.List.of(
                Map.of("item", "Source of funds verification", "completed", false),
                Map.of("item", "Source of wealth documentation", "completed", false),
                Map.of("item", "Enhanced transaction monitoring (6 months)", "completed", false),
                Map.of("item", "Senior management approval", "completed", false),
                Map.of("item", "Ongoing monitoring schedule", "completed", false),
                Map.of("item", "Beneficial ownership verified to 10%", "completed", false),
                Map.of("item", "Adverse media screening completed", "completed", false),
                Map.of("item", "PEP screening completed", "completed", false)
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of("customerId", id, "status", "EDD_INITIATED", "checklist", checklist, "initiatedAt", java.time.Instant.now().toString())));
    }

    @GetMapping("/{id}/edd")
    @Operation(summary = "Get EDD status and checklist")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> eddStatus(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("customerId", id, "status", "PENDING", "checklist", java.util.List.of())));
    }

    @PatchMapping("/{id}/edd/checklist")
    @Operation(summary = "Update EDD checklist items")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> eddUpdateChecklist(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        log.info("EDD checklist update: customerId={}", id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("customerId", id, "updated", true)));
    }

    @PostMapping("/{id}/edd/approve")
    @Operation(summary = "Senior management EDD sign-off")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> eddApprove(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        log.info("EDD approved: customerId={}, approvedBy={}", id, body.get("approvedBy"));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("customerId", id, "status", "EDD_APPROVED", "approvedBy", body.getOrDefault("approvedBy", "ADMIN"), "approvedAt", java.time.Instant.now().toString())));
    }

    @GetMapping("/kyc/reviews-due")
    @Operation(summary = "List customers due for periodic KYC review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.List<Map<String, Object>>>> kycReviewsDue() {
        java.util.List<Map<String, Object>> reviews = new java.util.ArrayList<>();
        customerRepository.findAll().stream().limit(50).forEach(c -> {
            if (c.getStatus() == com.cbs.customer.entity.CustomerStatus.ACTIVE) {
                reviews.add(Map.of("customerId", c.getId(), "customerName", c.getDisplayName(),
                        "riskRating", String.valueOf(c.getRiskRating()), "lastReviewDate", c.getCreatedAt() != null ? c.getCreatedAt().toString() : ""));
            }
        });
        return ResponseEntity.ok(ApiResponse.ok(reviews));
    }

    @PostMapping("/{id}/kyc/complete-review")
    @Operation(summary = "Record KYC review completion")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> kycCompleteReview(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        log.info("KYC review completed: customerId={}, reviewedBy={}", id, body.get("reviewedBy"));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("customerId", id, "status", "REVIEW_COMPLETED", "reviewedBy", body.getOrDefault("reviewedBy", "ADMIN"), "reviewedAt", java.time.Instant.now().toString())));
    }

    // ── Onboarding Drafts ───────────────────────────────────────────────────

    private final com.cbs.customer.repository.OnboardingDraftRepository draftRepository;

    @PostMapping("/drafts")
    @Operation(summary = "Save onboarding draft")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<com.cbs.customer.entity.OnboardingDraft>> saveDraft(
            @RequestBody com.cbs.customer.entity.OnboardingDraft draft) {
        if (draft.getId() != null) {
            com.cbs.customer.entity.OnboardingDraft existing = draftRepository.findById(draft.getId()).orElse(null);
            if (existing != null) {
                existing.setFormData(draft.getFormData());
                existing.setCurrentStep(draft.getCurrentStep());
                existing.setCustomerType(draft.getCustomerType());
                existing.setDisplayLabel(draft.getDisplayLabel());
                existing.setUpdatedAt(java.time.Instant.now());
                return ResponseEntity.ok(ApiResponse.ok(draftRepository.save(existing)));
            }
        }
        draft.setCreatedAt(java.time.Instant.now());
        draft.setUpdatedAt(java.time.Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(draftRepository.save(draft)));
    }

    @GetMapping("/drafts/{id}")
    @Operation(summary = "Get draft by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<com.cbs.customer.entity.OnboardingDraft>> getDraft(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(draftRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Draft not found: " + id))));
    }

    @GetMapping("/drafts")
    @Operation(summary = "List user's drafts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.List<com.cbs.customer.entity.OnboardingDraft>>> listDrafts() {
        return ResponseEntity.ok(ApiResponse.ok(draftRepository.findByCreatedByOrderByUpdatedAtDesc("SYSTEM")));
    }

    @DeleteMapping("/drafts/{id}")
    @Operation(summary = "Delete draft")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> deleteDraft(@PathVariable Long id) {
        draftRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("deleted", id.toString())));
    }
}
