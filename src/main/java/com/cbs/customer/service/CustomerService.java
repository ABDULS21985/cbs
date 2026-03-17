package com.cbs.customer.service;

import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.dto.*;
import com.cbs.customer.entity.*;
import com.cbs.customer.mapper.CustomerMapper;
import com.cbs.customer.repository.*;
import com.cbs.customer.validation.CustomerValidator;
import com.cbs.provider.kyc.KycProvider;
import com.cbs.provider.numbering.AccountNumberGenerator;
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
import java.util.Map;

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
    private final KycProvider kycProvider;
    private final AccountNumberGenerator numberGenerator;
    private final CbsProperties cbsProperties;

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
        return customerRepository.findAll(CustomerSpecifications.fromCriteria(criteria), pageable)
                .map(customerMapper::toSummaryResponse);
    }

    public Page<CustomerSummaryResponse> quickSearch(String searchTerm, Pageable pageable) {
        return customerRepository.searchCustomers(searchTerm, pageable)
                .map(customerMapper::toSummaryResponse);
    }

    // ========================================================================
    // CAPABILITY 2: Multi-Entity Customer Onboarding
    // ========================================================================

    @Transactional
    public CustomerResponse createCustomer(CreateCustomerRequest request) {
        log.info("Creating customer: type={}, channel={}", request.getCustomerType(), request.getOnboardedChannel());

        customerValidator.validateCreateRequest(request);
        checkForDuplicates(request);

        Customer customer = customerMapper.toEntity(request);
        customer.setCifNumber(numberGenerator.generateCif(customerRepository.getNextCifSequence()));
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setRiskRating(RiskRating.MEDIUM);

        // Default country of residence from deployment config if not provided
        if (!StringUtils.hasText(customer.getCountryOfResidence())) {
            String deployCountry = cbsProperties.getDeployment().getCountryCode();
            if (!"GLOBAL".equals(deployCountry)) {
                customer.setCountryOfResidence(deployCountry);
            }
        }

        if (!CollectionUtils.isEmpty(request.getAddresses())) {
            for (AddressDto addrDto : request.getAddresses()) {
                CustomerAddress address = customerMapper.toAddressEntity(addrDto);
                customer.addAddress(address);
            }
        }
        if (!CollectionUtils.isEmpty(request.getIdentifications())) {
            for (IdentificationDto idDto : request.getIdentifications()) {
                CustomerIdentification identification = customerMapper.toIdentificationEntity(idDto);
                customer.addIdentification(identification);
            }
        }
        if (!CollectionUtils.isEmpty(request.getContacts())) {
            for (ContactDto contactDto : request.getContacts()) {
                CustomerContact contact = customerMapper.toContactEntity(contactDto);
                customer.addContact(contact);
            }
        }

        Customer saved = customerRepository.save(customer);
        log.info("Customer created: cifNumber={}, id={}", saved.getCifNumber(), saved.getId());
        return customerMapper.toResponse(saved);
    }

    @Transactional
    public CustomerResponse updateCustomer(Long customerId, UpdateCustomerRequest request) {
        Customer customer = findCustomerOrThrow(customerId);

        if (StringUtils.hasText(request.getEmail())) {
            customerRepository.findByEmailExcludingId(request.getEmail(), customerId)
                    .ifPresent(c -> { throw new DuplicateResourceException("Customer", "email", request.getEmail()); });
        }
        if (StringUtils.hasText(request.getPhonePrimary())) {
            customerRepository.findByPhonePrimaryExcludingId(request.getPhonePrimary(), customerId)
                    .ifPresent(c -> { throw new DuplicateResourceException("Customer", "phonePrimary", request.getPhonePrimary()); });
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
        customerRepository.save(customer);

        CustomerNote statusNote = CustomerNote.builder()
                .noteType(NoteType.INTERNAL)
                .subject("Status Changed")
                .content(String.format("Status changed from %s to %s. Reason: %s",
                        oldStatus, request.getNewStatus(), request.getReason()))
                .build();
        customer.addNote(statusNote);
        noteRepository.save(statusNote);

        log.info("Customer status: cifNumber={}, {} -> {}", customer.getCifNumber(), oldStatus, request.getNewStatus());
        return customerMapper.toResponse(customer);
    }

    // ========================================================================
    // CAPABILITY 3: eKYC — Delegated to pluggable KycProvider
    // ========================================================================

    @Transactional
    public KycVerificationResponse verifyIdentification(KycVerificationRequest request) {
        Customer customer = findCustomerOrThrow(request.getCustomerId());

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

        if (identification.isExpired()) {
            return KycVerificationResponse.builder()
                    .customerId(customer.getId()).cifNumber(customer.getCifNumber())
                    .idType(request.getIdType()).idNumber(request.getIdNumber())
                    .status(KycVerificationResponse.VerificationStatus.EXPIRED_DOCUMENT)
                    .failureReason("Identification document has expired")
                    .build();
        }

        // Delegate to configured KycProvider (INTERNAL, Onfido, Jumio, SumSub, etc.)
        KycProvider.KycResult result = kycProvider.verify(KycProvider.KycVerifyCommand.builder()
                .idType(request.getIdType())
                .idNumber(request.getIdNumber())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .dateOfBirth(request.getDateOfBirth())
                .country(cbsProperties.getDeployment().getCountryCode())
                .build());

        if (result.isVerified()) {
            identification.setIsVerified(true);
            identification.setVerifiedAt(Instant.now());
            identification.setVerificationProvider(result.getProviderName());
            identification.setVerificationRef(result.getProviderReference());
            identificationRepository.save(identification);

            log.info("KYC verified: customer={}, idType={}, provider={}",
                    customer.getCifNumber(), request.getIdType(), result.getProviderName());

            return KycVerificationResponse.builder()
                    .customerId(customer.getId()).cifNumber(customer.getCifNumber())
                    .idType(request.getIdType()).idNumber(request.getIdNumber())
                    .status(KycVerificationResponse.VerificationStatus.VERIFIED)
                    .verifiedAt(result.getVerifiedAt())
                    .verificationProvider(result.getProviderName())
                    .verificationReference(result.getProviderReference())
                    .build();
        }

        log.warn("KYC failed: customer={}, idType={}, reason={}",
                customer.getCifNumber(), request.getIdType(), result.getFailureReason());

        return KycVerificationResponse.builder()
                .customerId(customer.getId()).cifNumber(customer.getCifNumber())
                .idType(request.getIdType()).idNumber(request.getIdNumber())
                .status(KycVerificationResponse.VerificationStatus.FAILED)
                .failureReason(result.getFailureReason())
                .verificationProvider(result.getProviderName())
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
        return customerMapper.toIdentificationDto(saved);
    }

    public List<IdentificationDto> getIdentifications(Long customerId) {
        findCustomerOrThrow(customerId);
        return customerMapper.toIdentificationDtoList(identificationRepository.findByCustomerId(customerId));
    }

    // ========================================================================
    // CAPABILITY 4: Sub-resource CRUD (Addresses, Contacts, Notes, Relationships)
    // ========================================================================

    @Transactional
    public AddressDto addAddress(Long customerId, AddressDto dto) {
        Customer customer = findCustomerOrThrow(customerId);
        CustomerAddress address = customerMapper.toAddressEntity(dto);
        customer.addAddress(address);
        if (Boolean.TRUE.equals(dto.getIsPrimary())) {
            addressRepository.clearPrimaryFlag(customerId, 0L);
        }
        return customerMapper.toAddressDto(addressRepository.save(address));
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
        address.setDistrict(dto.getDistrict());
        address.setLandmark(dto.getLandmark());
        address.setLatitude(dto.getLatitude());
        address.setLongitude(dto.getLongitude());
        if (Boolean.TRUE.equals(dto.getIsPrimary())) {
            addressRepository.clearPrimaryFlag(customerId, addressId);
            address.setIsPrimary(true);
        }
        return customerMapper.toAddressDto(addressRepository.save(address));
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
    }

    @Transactional
    public NoteDto addNote(Long customerId, NoteDto dto) {
        Customer customer = findCustomerOrThrow(customerId);
        CustomerNote note = customerMapper.toNoteEntity(dto);
        customer.addNote(note);
        return customerMapper.toNoteDto(noteRepository.save(note));
    }

    public Page<NoteDto> getNotes(Long customerId, Pageable pageable) {
        findCustomerOrThrow(customerId);
        return noteRepository.findByCustomerId(customerId, pageable).map(customerMapper::toNoteDto);
    }

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
                .customer(customer).relatedCustomer(relatedCustomer)
                .relationshipType(dto.getRelationshipType())
                .ownershipPercentage(dto.getOwnershipPercentage())
                .notes(dto.getNotes())
                .effectiveFrom(dto.getEffectiveFrom() != null ? dto.getEffectiveFrom() : java.time.LocalDate.now())
                .effectiveTo(dto.getEffectiveTo())
                .build();

        return customerMapper.toRelationshipDto(relationshipRepository.save(relationship));
    }

    public List<RelationshipDto> getRelationships(Long customerId) {
        findCustomerOrThrow(customerId);
        return customerMapper.toRelationshipDtoList(relationshipRepository.findAllRelationships(customerId));
    }

    @Transactional
    public ContactDto addContact(Long customerId, ContactDto dto) {
        Customer customer = findCustomerOrThrow(customerId);
        CustomerContact contact = customerMapper.toContactEntity(dto);
        customer.addContact(contact);
        CustomerContact saved = customerRepository.save(customer)
                .getContacts().stream()
                .filter(c -> c.getContactValue().equals(dto.getContactValue()) && c.getContactType() == dto.getContactType())
                .findFirst().orElse(contact);
        return customerMapper.toContactDto(saved);
    }

    public List<ContactDto> getContacts(Long customerId) {
        findCustomerOrThrow(customerId);
        Customer customer = customerRepository.findByIdWithDetails(customerId).orElseThrow();
        return customerMapper.toContactDtoList(customer.getContacts());
    }

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

    private void checkForDuplicates(CreateCustomerRequest request) {
        if (StringUtils.hasText(request.getEmail()) && customerRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Customer", "email", request.getEmail());
        }
        if (StringUtils.hasText(request.getPhonePrimary()) && customerRepository.existsByPhonePrimary(request.getPhonePrimary())) {
            throw new DuplicateResourceException("Customer", "phonePrimary", request.getPhonePrimary());
        }
    }
}
