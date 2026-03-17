package com.cbs.customer.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.customer.dto.*;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.entity.RiskRating;
import com.cbs.customer.service.CustomerService;
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

@RestController
@RequestMapping("/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customer Management", description = "360° Customer View, Onboarding, eKYC, and Account Structures")
public class CustomerController {

    private final CustomerService customerService;

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
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

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
}
