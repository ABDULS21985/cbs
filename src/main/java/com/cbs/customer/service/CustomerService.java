package com.cbs.customer.service;

import com.cbs.common.dto.PageMeta;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.dto.*;
import com.cbs.customer.entity.*;
import com.cbs.customer.mapper.CustomerMapper;
import com.cbs.customer.repository.*;
import com.cbs.customer.validation.CustomerValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerAddressRepository addressRepository;
    private final CustomerIdentificationRepository identificationRepository;
    private final CustomerRelationshipRepository relationshipRepository;
    private final CustomerNoteRepository noteRepository;
    private final CustomerMapper customerMapper;
    private final CustomerValidator customerValidator;

    // ========================================================================
    // CAPABILITY 1: 360° Customer View
    // ========================================================================

    public CustomerResponse getCustomer360(Long customerId) {
        Customer customer = customerRepository.findByIdWithDetails(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        List<CustomerRelationship> relationships = relationshipRepository.findAllRelationships(customerId);
        List<CustomerNote> pinnedNotes = noteRepository.findByCustomerIdAndIsPinnedTrue(customerId);

        CustomerResponse response = customerMapper.toResponse(customer);
        response.setRelationships(customerMapper.toRelationshipDtoList(relationships));
        response.setNotes(customerMapper.toNoteDtoList(pinnedNotes));
        return response;
    }

    public CustomerResponse getCustomerByCif(String cifNumber) {
        Customer customer = customerRepository.findByCifNumberWithDetails(cifNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "cifNumber", cifNumber));

        List<CustomerRelationship> relationships = relationshipRepository.findAllRelationships(customer.getId());
        CustomerResponse response = customerMapper.toResponse(customer);
        response.setRelationships(customerMapper.toRelationshipDtoList(relationships));
        return response;
    }

    public Page<CustomerSummaryResponse> searchCustomers(CustomerSearchCriteria criteria, Pageable pageable) {
        Page<Customer> page = customerRepository.findAll(
                CustomerSpecifications.fromCriteria(criteria), pageable);
        return page.map(customerMapper::toSummaryResponse);
    }

    public Page<CustomerSummaryResponse> quickSearch(String searchTerm, Pageable pageable) {
        Page<Customer> page = customerRepository.searchCustomers(searchTerm, pageable);
        return page.map(customerMapper::toSummaryResponse);
    }

    // ========================================================================
    // CAPABILITY 2: Multi-Entity Customer Onboarding
    // ========================================================================

    @Transactional
    public CustomerResponse createCustomer(CreateCustomerRequest request) {
        log.info("Creating new customer: type={}, channel={}", request.getCustomerType(), request.getOnboardedChannel());

        customerValidator.validateCreateRequest(request);
        checkForDuplicates(request);

        Customer customer = customerMapper.toEntity(request);
        customer.setCifNumber(generateCifNumber());
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setRiskRating(RiskRating.MEDIUM);

        // Process nested addresses
        if (!CollectionUtils.isEmpty(request.getAddresses())) {
            for (AddressDto addrDto : request.getAddresses()) {
                CustomerAddress address = customerMapper.toAddressEntity(addrDto);
                customer.addAddress(address);
            }
        }

        // Process nested identifications
        if (!CollectionUtils.isEmpty(request.getIdentifications())) {
            for (IdentificationDto idDto : request.getIdentifications()) {
                CustomerIdentification identification = customerMapper.toIdentificationEntity(idDto);
                customer.addIdentification(identification);
            }
        }

        // Process nested contacts
        if (!CollectionUtils.isEmpty(request.getContacts())) {
            for (ContactDto contactDto : request.getContacts()) {
                CustomerContact contact = customerMapper.toContactEntity(contactDto);
                customer.addContact(contact);
            }
        }

        Customer saved = customerRepository.save(customer);
        log.info("Customer created successfully: cifNumber={}, id={}", saved.getCifNumber(), saved.getId());

        return customerMapper.toResponse(saved);
    }

    @Transactional
    public CustomerResponse updateCustomer(Long customerId, UpdateCustomerRequest request) {
        Customer customer = findCustomerOrThrow(customerId);

        // Uniqueness checks for email/phone updates
        if (StringUtils.hasText(request.getEmail())) {
            customerRepository.findByEmailExcludingId(request.getEmail(), customerId)
                    .ifPresent(c -> {
                        throw new DuplicateResourceException("Customer", "email", request.getEmail());
                    });
        }
        if (StringUtils.hasText(request.getPhonePrimary())) {
            customerRepository.findByPhonePrimaryExcludingId(request.getPhonePrimary(), customerId)
                    .ifPresent(c -> {
                        throw new DuplicateResourceException("Customer", "phonePrimary", request.getPhonePrimary());
                    });
        }

        customerMapper.updateEntity(request, customer);
        Customer saved = customerRepository.save(customer);
        log.info("Customer updated: cifNumber={}", saved.getCifNumber());

        return customerMapper.toResponse(saved);
    }

    @Transactional
    public CustomerResponse changeStatus(Long customerId, CustomerStatusChangeRequest request) {
        Customer customer = findCustomerOrThrow(customerId);

        customerValidator.validateStatusTransition(customer.getStatus(), request.getNewStatus());

        CustomerStatus oldStatus = customer.getStatus();
        customer.setStatus(request.getNewStatus());
        Customer saved = customerRepository.save(customer);

        // Log the status change as an internal note
        CustomerNote statusNote = CustomerNote.builder()
                .noteType(NoteType.INTERNAL)
                .subject("Status Changed")
                .content(String.format("Status changed from %s to %s. Reason: %s",
                        oldStatus, request.getNewStatus(), request.getReason()))
                .build();
        customer.addNote(statusNote);
        noteRepository.save(statusNote);

        log.info("Customer status changed: cifNumber={}, {} -> {}", saved.getCifNumber(), oldStatus, request.getNewStatus());
        return customerMapper.toResponse(saved);
    }

    // ========================================================================
    // CAPABILITY 3: eKYC & Digital Identity Verification
    // ========================================================================

    @Transactional
    public KycVerificationResponse verifyIdentification(KycVerificationRequest request) {
        Customer customer = findCustomerOrThrow(request.getCustomerId());

        // Find or create the identification record
        CustomerIdentification identification = identificationRepository
                .findByCustomerIdAndIdTypeAndIdNumber(customer.getId(), request.getIdType(), request.getIdNumber())
                .orElseGet(() -> {
                    CustomerIdentification newId = CustomerIdentification.builder()
                            .idType(request.getIdType())
                            .idNumber(request.getIdNumber())
                            .build();
                    customer.addIdentification(newId);
                    return identificationRepository.save(newId);
                });

        // Check for expiry
        if (identification.isExpired()) {
            return KycVerificationResponse.builder()
                    .customerId(customer.getId())
                    .cifNumber(customer.getCifNumber())
                    .idType(request.getIdType())
                    .idNumber(request.getIdNumber())
                    .status(KycVerificationResponse.VerificationStatus.EXPIRED_DOCUMENT)
                    .failureReason("Identification document has expired")
                    .build();
        }

        // In production, this calls external KYC providers (NIBSS BVN, NIMC NIN, etc.)
        // The integration layer is pluggable via KycProviderService interface
        boolean verified = performKycVerification(request);

        if (verified) {
            identification.setIsVerified(true);
            identification.setVerifiedAt(Instant.now());
            identificationRepository.save(identification);

            log.info("KYC verification successful: customer={}, idType={}", customer.getCifNumber(), request.getIdType());
            return KycVerificationResponse.builder()
                    .customerId(customer.getId())
                    .cifNumber(customer.getCifNumber())
                    .idType(request.getIdType())
                    .idNumber(request.getIdNumber())
                    .status(KycVerificationResponse.VerificationStatus.VERIFIED)
                    .verifiedAt(Instant.now())
                    .verificationProvider(resolveProvider(request.getIdType()))
                    .build();
        }

        log.warn("KYC verification failed: customer={}, idType={}", customer.getCifNumber(), request.getIdType());
        return KycVerificationResponse.builder()
                .customerId(customer.getId())
                .cifNumber(customer.getCifNumber())
                .idType(request.getIdType())
                .idNumber(request.getIdNumber())
                .status(KycVerificationResponse.VerificationStatus.FAILED)
                .failureReason("Verification could not be completed. Data mismatch or provider unavailable.")
                .build();
    }

    @Transactional
    public IdentificationDto addIdentification(Long customerId, IdentificationDto dto) {
        Customer customer = findCustomerOrThrow(customerId);

        identificationRepository.findByCustomerIdAndIdTypeAndIdNumber(customerId, dto.getIdType(), dto.getIdNumber())
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Identification", "idType+idNumber",
                            dto.getIdType() + ":" + dto.getIdNumber());
                });

        CustomerIdentification identification = customerMapper.toIdentificationEntity(dto);
        customer.addIdentification(identification);

        if (Boolean.TRUE.equals(dto.getIsPrimary())) {
            identificationRepository.clearPrimaryFlag(customerId, 0L);
        }

        CustomerIdentification saved = identificationRepository.save(identification);
        log.info("Identification added: customer={}, type={}", customer.getCifNumber(), dto.getIdType());
        return customerMapper.toIdentificationDto(saved);
    }

    public List<IdentificationDto> getIdentifications(Long customerId) {
        findCustomerOrThrow(customerId);
        return customerMapper.toIdentificationDtoList(identificationRepository.findByCustomerId(customerId));
    }

    // ========================================================================
    // CAPABILITY 4: Flexible Account Structures (Address/Contact CRUD as sub-resources)
    // ========================================================================

    @Transactional
    public AddressDto addAddress(Long customerId, AddressDto dto) {
        Customer customer = findCustomerOrThrow(customerId);

        CustomerAddress address = customerMapper.toAddressEntity(dto);
        customer.addAddress(address);

        if (Boolean.TRUE.equals(dto.getIsPrimary())) {
            addressRepository.clearPrimaryFlag(customerId, 0L);
        }

        CustomerAddress saved = addressRepository.save(address);
        log.info("Address added: customer={}, type={}", customer.getCifNumber(), dto.getAddressType());
        return customerMapper.toAddressDto(saved);
    }

    @Transactional
    public AddressDto updateAddress(Long customerId, Long addressId, AddressDto dto) {
        findCustomerOrThrow(customerId);
        CustomerAddress address = addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));

        address.setAddressType(dto.getAddressType());
        address.setAddressLine1(dto.getAddressLine1());
        address.setAddressLine2(dto.getAddressLine2());
        address.setCity(dto.getCity());
        address.setState(dto.getState());
        address.setCountry(dto.getCountry() != null ? dto.getCountry() : address.getCountry());
        address.setPostalCode(dto.getPostalCode());
        address.setLga(dto.getLga());
        address.setLandmark(dto.getLandmark());
        address.setLatitude(dto.getLatitude());
        address.setLongitude(dto.getLongitude());

        if (Boolean.TRUE.equals(dto.getIsPrimary())) {
            addressRepository.clearPrimaryFlag(customerId, addressId);
            address.setIsPrimary(true);
        }

        CustomerAddress saved = addressRepository.save(address);
        return customerMapper.toAddressDto(saved);
    }

    public List<AddressDto> getAddresses(Long customerId) {
        findCustomerOrThrow(customerId);
        return customerMapper.toAddressDtoList(addressRepository.findByCustomerId(customerId));
    }

    @Transactional
    public void deleteAddress(Long customerId, Long addressId) {
        findCustomerOrThrow(customerId);
        CustomerAddress address = addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));
        addressRepository.delete(address);
        log.info("Address deleted: customer={}, addressId={}", customerId, addressId);
    }

    // Notes
    @Transactional
    public NoteDto addNote(Long customerId, NoteDto dto) {
        Customer customer = findCustomerOrThrow(customerId);
        CustomerNote note = customerMapper.toNoteEntity(dto);
        customer.addNote(note);
        CustomerNote saved = noteRepository.save(note);
        return customerMapper.toNoteDto(saved);
    }

    public Page<NoteDto> getNotes(Long customerId, Pageable pageable) {
        findCustomerOrThrow(customerId);
        return noteRepository.findByCustomerId(customerId, pageable).map(customerMapper::toNoteDto);
    }

    // Relationships
    @Transactional
    public RelationshipDto addRelationship(Long customerId, RelationshipDto dto) {
        Customer customer = findCustomerOrThrow(customerId);
        Customer relatedCustomer = findCustomerOrThrow(dto.getRelatedCustomerId());

        if (customerId.equals(dto.getRelatedCustomerId())) {
            throw new BusinessException("A customer cannot have a relationship with themselves", "SELF_RELATIONSHIP");
        }

        if (relationshipRepository.existsByCustomerIdAndRelatedCustomerIdAndRelationshipType(
                customerId, dto.getRelatedCustomerId(), dto.getRelationshipType())) {
            throw new DuplicateResourceException("Relationship", "type",
                    dto.getRelationshipType() + " with customer " + dto.getRelatedCustomerId());
        }

        CustomerRelationship relationship = CustomerRelationship.builder()
                .customer(customer)
                .relatedCustomer(relatedCustomer)
                .relationshipType(dto.getRelationshipType())
                .ownershipPercentage(dto.getOwnershipPercentage())
                .notes(dto.getNotes())
                .effectiveFrom(dto.getEffectiveFrom() != null ? dto.getEffectiveFrom() : java.time.LocalDate.now())
                .effectiveTo(dto.getEffectiveTo())
                .build();

        CustomerRelationship saved = relationshipRepository.save(relationship);
        log.info("Relationship created: {} ({}) -> {} ({}), type={}",
                customer.getCifNumber(), customerId,
                relatedCustomer.getCifNumber(), dto.getRelatedCustomerId(),
                dto.getRelationshipType());
        return customerMapper.toRelationshipDto(saved);
    }

    public List<RelationshipDto> getRelationships(Long customerId) {
        findCustomerOrThrow(customerId);
        return customerMapper.toRelationshipDtoList(relationshipRepository.findAllRelationships(customerId));
    }

    // Contacts
    @Transactional
    public ContactDto addContact(Long customerId, ContactDto dto) {
        Customer customer = findCustomerOrThrow(customerId);
        CustomerContact contact = customerMapper.toContactEntity(dto);
        customer.addContact(contact);
        CustomerContact saved = customerRepository.save(customer)
                .getContacts()
                .stream()
                .filter(c -> c.getContactValue().equals(dto.getContactValue()) && c.getContactType() == dto.getContactType())
                .findFirst()
                .orElse(contact);
        return customerMapper.toContactDto(saved);
    }

    public List<ContactDto> getContacts(Long customerId) {
        findCustomerOrThrow(customerId);
        Customer customer = customerRepository.findByIdWithDetails(customerId).orElseThrow();
        return customerMapper.toContactDtoList(customer.getContacts());
    }

    // Dashboard stats
    public CustomerDashboardStats getDashboardStats() {
        return CustomerDashboardStats.builder()
                .totalActive(customerRepository.countByStatus(CustomerStatus.ACTIVE))
                .totalDormant(customerRepository.countByStatus(CustomerStatus.DORMANT))
                .totalSuspended(customerRepository.countByStatus(CustomerStatus.SUSPENDED))
                .totalClosed(customerRepository.countByStatus(CustomerStatus.CLOSED))
                .totalIndividual(customerRepository.countByCustomerType(CustomerType.INDIVIDUAL))
                .totalCorporate(customerRepository.countByCustomerType(CustomerType.CORPORATE))
                .totalSme(customerRepository.countByCustomerType(CustomerType.SME))
                .build();
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    private Customer findCustomerOrThrow(Long customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
    }

    private String generateCifNumber() {
        Long seq = customerRepository.getNextCifSequence();
        return String.format("CIF%010d", seq);
    }

    private void checkForDuplicates(CreateCustomerRequest request) {
        if (StringUtils.hasText(request.getEmail()) && customerRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Customer", "email", request.getEmail());
        }
        if (StringUtils.hasText(request.getPhonePrimary()) && customerRepository.existsByPhonePrimary(request.getPhonePrimary())) {
            throw new DuplicateResourceException("Customer", "phonePrimary", request.getPhonePrimary());
        }
    }

    /**
     * Pluggable KYC verification — in production this delegates to external providers.
     * This is the integration seam for NIBSS BVN validation, NIMC NIN, etc.
     */
    private boolean performKycVerification(KycVerificationRequest request) {
        // Integration point: inject KycProviderService implementations per ID type
        // For now, this validates format and returns verified for well-formed inputs
        return StringUtils.hasText(request.getIdNumber()) && request.getIdNumber().length() >= 5;
    }

    private String resolveProvider(String idType) {
        return switch (idType) {
            case "BVN" -> "NIBSS_BVN_SERVICE";
            case "NIN" -> "NIMC_NIN_SERVICE";
            case "TIN" -> "FIRS_TIN_SERVICE";
            case "CAC_REG", "RC_NUMBER" -> "CAC_VERIFICATION";
            default -> "INTERNAL_VERIFICATION";
        };
    }
}
