package com.cbs.branch.service;

import com.cbs.branch.entity.*;
import com.cbs.branch.repository.BranchRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BranchService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[0-9\\-\\s]{7,20}$");

    private final BranchRepository branchRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public Branch createBranch(Branch branch) {
        validateBranchFields(branch);
        branchRepository.findByBranchCode(branch.getBranchCode()).ifPresent(existing -> {
            throw new DuplicateResourceException("Branch", "branchCode", branch.getBranchCode());
        });
        Branch saved = branchRepository.save(branch);
        log.info("AUDIT: Branch created: code={}, name={}, type={}, actor={}",
                branch.getBranchCode(), branch.getBranchName(), branch.getBranchType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public Branch getBranch(Long id) {
        return branchRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Branch", "id", id));
    }

    public Branch getBranchByCode(String code) {
        return branchRepository.findByBranchCode(code).orElseThrow(() -> new ResourceNotFoundException("Branch", "code", code));
    }

    public List<Branch> getAllActiveBranches() { return branchRepository.findByIsActiveTrueOrderByBranchNameAsc(); }

    public List<Branch> getChildBranches(String parentCode) {
        return branchRepository.findByParentBranchCodeAndIsActiveTrue(parentCode);
    }

    public List<Branch> getRegionBranches(String regionCode) {
        return branchRepository.findByRegionCodeAndIsActiveTrue(regionCode);
    }

    public List<Branch> getBranchesByType(BranchType type) {
        return branchRepository.findByBranchTypeAndIsActiveTrue(type);
    }

    @Transactional
    public Branch updateBranch(Long id, Branch updated) {
        Branch branch = getBranch(id);
        // Duplicate branchCode check on update
        if (updated.getBranchCode() != null && !updated.getBranchCode().equals(branch.getBranchCode())) {
            branchRepository.findByBranchCode(updated.getBranchCode()).ifPresent(existing -> {
                throw new DuplicateResourceException("Branch", "branchCode", updated.getBranchCode());
            });
            branch.setBranchCode(updated.getBranchCode());
        }
        // Email format validation
        if (updated.getEmail() != null) {
            if (!EMAIL_PATTERN.matcher(updated.getEmail()).matches()) {
                throw new BusinessException("Invalid email format: " + updated.getEmail(), "INVALID_EMAIL");
            }
            branch.setEmail(updated.getEmail());
        }
        // Phone format validation
        if (updated.getPhoneNumber() != null) {
            if (!PHONE_PATTERN.matcher(updated.getPhoneNumber()).matches()) {
                throw new BusinessException("Invalid phone number format: " + updated.getPhoneNumber(), "INVALID_PHONE");
            }
            branch.setPhoneNumber(updated.getPhoneNumber());
        }
        if (updated.getBranchName() != null) branch.setBranchName(updated.getBranchName());
        if (updated.getManagerName() != null) branch.setManagerName(updated.getManagerName());
        if (updated.getManagerEmployeeId() != null) branch.setManagerEmployeeId(updated.getManagerEmployeeId());
        if (updated.getOperatingHours() != null) branch.setOperatingHours(updated.getOperatingHours());
        if (updated.getServicesOffered() != null) branch.setServicesOffered(updated.getServicesOffered());
        Branch saved = branchRepository.save(branch);
        log.info("AUDIT: Branch updated: code={}, actor={}", branch.getBranchCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public Branch closeBranch(Long id) {
        Branch branch = getBranch(id);
        if (!Boolean.TRUE.equals(branch.getIsActive())) {
            throw new BusinessException("Branch " + branch.getBranchCode() + " is already closed", "BRANCH_ALREADY_CLOSED");
        }
        // Check for active child branches before closing
        List<Branch> activeChildren = branchRepository.findByParentBranchCodeAndIsActiveTrue(branch.getBranchCode());
        if (!activeChildren.isEmpty()) {
            throw new BusinessException("Cannot close branch " + branch.getBranchCode()
                    + ": it has " + activeChildren.size() + " active child branches", "ACTIVE_CHILDREN_EXIST");
        }
        branch.setIsActive(false);
        branch.setClosedDate(java.time.LocalDate.now());
        Branch saved = branchRepository.save(branch);
        log.info("AUDIT: Branch closed: code={}, actor={}", branch.getBranchCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    private void validateBranchFields(Branch branch) {
        if (branch.getBranchCode() == null || branch.getBranchCode().isBlank()) {
            throw new BusinessException("Branch code is required", "MISSING_BRANCH_CODE");
        }
        if (branch.getBranchName() == null || branch.getBranchName().isBlank()) {
            throw new BusinessException("Branch name is required", "MISSING_BRANCH_NAME");
        }
        if (branch.getEmail() != null && !EMAIL_PATTERN.matcher(branch.getEmail()).matches()) {
            throw new BusinessException("Invalid email format: " + branch.getEmail(), "INVALID_EMAIL");
        }
        if (branch.getPhoneNumber() != null && !PHONE_PATTERN.matcher(branch.getPhoneNumber()).matches()) {
            throw new BusinessException("Invalid phone number format: " + branch.getPhoneNumber(), "INVALID_PHONE");
        }
    }
}
