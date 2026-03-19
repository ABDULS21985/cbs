package com.cbs.lending.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.lending.dto.CollateralDto;
import com.cbs.lending.dto.CollateralValuationDto;
import com.cbs.lending.entity.*;
import com.cbs.lending.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CollateralService {

    private final CollateralRepository collateralRepository;
    private final CollateralValuationRepository valuationRepository;
    private final LoanCollateralLinkRepository linkRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public CollateralDto registerCollateral(CollateralDto dto) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", dto.getCustomerId()));

        Long seq = collateralRepository.getNextCollateralSequence();
        String collateralNumber = String.format("COL%012d", seq);

        Collateral collateral = Collateral.builder()
                .collateralNumber(collateralNumber)
                .customer(customer)
                .collateralType(dto.getCollateralType())
                .description(dto.getDescription())
                .marketValue(dto.getMarketValue())
                .forcedSaleValue(dto.getForcedSaleValue())
                .lastValuationDate(LocalDate.now())
                .valuationSource(dto.getValuationSource())
                .currencyCode(dto.getCurrencyCode())
                .isInsured(dto.getIsInsured() != null ? dto.getIsInsured() : false)
                .insurancePolicyNumber(dto.getInsurancePolicyNumber())
                .insuranceExpiryDate(dto.getInsuranceExpiryDate())
                .insuranceValue(dto.getInsuranceValue())
                .location(dto.getLocation())
                .registrationNumber(dto.getRegistrationNumber())
                .registrationAuthority(dto.getRegistrationAuthority())
                .status("ACTIVE")
                .build();

        Collateral saved = collateralRepository.save(collateral);
        log.info("Collateral registered: number={}, type={}, value={}", collateralNumber, dto.getCollateralType(), dto.getMarketValue());
        return toDto(saved);
    }

    public CollateralDto getCollateral(Long id) {
        Collateral c = collateralRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collateral", "id", id));
        return toDto(c);
    }

    public Page<CollateralDto> getCustomerCollaterals(Long customerId, Pageable pageable) {
        return collateralRepository.findByCustomerId(customerId, pageable).map(this::toDto);
    }

    public Page<CollateralDto> getAllCollaterals(Pageable pageable) {
        return collateralRepository.findAll(pageable).map(this::toDto);
    }

    @Transactional
    public CollateralValuationDto addValuation(Long collateralId, CollateralValuationDto dto) {
        Collateral collateral = collateralRepository.findById(collateralId)
                .orElseThrow(() -> new ResourceNotFoundException("Collateral", "id", collateralId));

        CollateralValuation valuation = CollateralValuation.builder()
                .collateral(collateral)
                .valuationDate(dto.getValuationDate())
                .marketValue(dto.getMarketValue())
                .forcedSaleValue(dto.getForcedSaleValue())
                .valuationMethod(dto.getValuationMethod())
                .valuerName(dto.getValuerName())
                .valuerOrganisation(dto.getValuerOrganisation())
                .valuerLicenseNumber(dto.getValuerLicenseNumber())
                .reportReference(dto.getReportReference())
                .reportUrl(dto.getReportUrl())
                .notes(dto.getNotes())
                .status("COMPLETED")
                .nextValuationDate(dto.getNextValuationDate())
                .build();

        valuationRepository.save(valuation);

        // Update collateral with latest valuation
        collateral.setMarketValue(dto.getMarketValue());
        collateral.setForcedSaleValue(dto.getForcedSaleValue());
        collateral.setLastValuationDate(dto.getValuationDate());
        collateral.setNextValuationDate(dto.getNextValuationDate());
        collateral.setValuationSource(dto.getValuerOrganisation());
        collateralRepository.save(collateral);

        log.info("Collateral valuation added: collateral={}, value={}, method={}",
                collateral.getCollateralNumber(), dto.getMarketValue(), dto.getValuationMethod());
        return dto;
    }

    public List<CollateralValuationDto> getValuationHistory(Long collateralId) {
        return valuationRepository.findByCollateralIdOrderByValuationDateDesc(collateralId)
                .stream().map(v -> CollateralValuationDto.builder()
                        .id(v.getId()).valuationDate(v.getValuationDate())
                        .marketValue(v.getMarketValue()).forcedSaleValue(v.getForcedSaleValue())
                        .valuationMethod(v.getValuationMethod())
                        .valuerName(v.getValuerName()).valuerOrganisation(v.getValuerOrganisation())
                        .reportReference(v.getReportReference()).status(v.getStatus())
                        .nextValuationDate(v.getNextValuationDate()).build())
                .toList();
    }

    @Transactional
    public void linkToLoan(Long collateralId, Long loanAccountId, BigDecimal allocatedValue) {
        Collateral collateral = collateralRepository.findById(collateralId)
                .orElseThrow(() -> new ResourceNotFoundException("Collateral", "id", collateralId));
        LoanAccount loan = loanAccountRepository.findById(loanAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanAccount", "id", loanAccountId));

        if (linkRepository.existsByLoanAccountIdAndCollateralId(loanAccountId, collateralId)) {
            throw new DuplicateResourceException("LoanCollateralLink", "loan+collateral", loanAccountId + "+" + collateralId);
        }

        BigDecimal coverage = allocatedValue
                .multiply(BigDecimal.valueOf(100))
                .divide(loan.getOutstandingPrincipal(), 2, RoundingMode.HALF_UP);

        LoanCollateralLink link = LoanCollateralLink.builder()
                .loanAccount(loan).collateral(collateral)
                .allocatedValue(allocatedValue).coveragePercentage(coverage)
                .isPrimary(linkRepository.findByLoanAccountId(loanAccountId).isEmpty())
                .build();
        linkRepository.save(link);

        // Mark lien on collateral
        collateral.markLien(allocatedValue, loan.getLoanNumber());
        collateralRepository.save(collateral);

        log.info("Collateral {} linked to loan {}: allocated={}, coverage={}%",
                collateral.getCollateralNumber(), loan.getLoanNumber(), allocatedValue, coverage);
    }

    @Transactional
    public void releaseLien(Long collateralId, Long loanAccountId) {
        Collateral collateral = collateralRepository.findById(collateralId)
                .orElseThrow(() -> new ResourceNotFoundException("Collateral", "id", collateralId));

        collateral.releaseLien();
        collateralRepository.save(collateral);
        log.info("Collateral {} lien released", collateral.getCollateralNumber());
    }

    private CollateralDto toDto(Collateral c) {
        return CollateralDto.builder()
                .id(c.getId()).collateralNumber(c.getCollateralNumber())
                .customerId(c.getCustomer().getId()).collateralType(c.getCollateralType())
                .description(c.getDescription()).marketValue(c.getMarketValue())
                .forcedSaleValue(c.getForcedSaleValue()).lastValuationDate(c.getLastValuationDate())
                .valuationSource(c.getValuationSource()).currencyCode(c.getCurrencyCode())
                .lienStatus(c.getLienStatus()).lienAmount(c.getLienAmount())
                .isInsured(c.getIsInsured()).insurancePolicyNumber(c.getInsurancePolicyNumber())
                .insuranceExpiryDate(c.getInsuranceExpiryDate()).insuranceValue(c.getInsuranceValue())
                .location(c.getLocation()).registrationNumber(c.getRegistrationNumber())
                .registrationAuthority(c.getRegistrationAuthority()).status(c.getStatus()).build();
    }
}
