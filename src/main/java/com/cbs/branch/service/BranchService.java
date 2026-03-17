package com.cbs.branch.service;

import com.cbs.branch.entity.*;
import com.cbs.branch.repository.BranchRepository;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BranchService {

    private final BranchRepository branchRepository;

    @Transactional
    public Branch createBranch(Branch branch) {
        branchRepository.findByBranchCode(branch.getBranchCode()).ifPresent(existing -> {
            throw new DuplicateResourceException("Branch", "branchCode", branch.getBranchCode());
        });
        Branch saved = branchRepository.save(branch);
        log.info("Branch created: code={}, name={}, type={}", branch.getBranchCode(), branch.getBranchName(), branch.getBranchType());
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
        if (updated.getBranchName() != null) branch.setBranchName(updated.getBranchName());
        if (updated.getManagerName() != null) branch.setManagerName(updated.getManagerName());
        if (updated.getManagerEmployeeId() != null) branch.setManagerEmployeeId(updated.getManagerEmployeeId());
        if (updated.getPhoneNumber() != null) branch.setPhoneNumber(updated.getPhoneNumber());
        if (updated.getEmail() != null) branch.setEmail(updated.getEmail());
        if (updated.getOperatingHours() != null) branch.setOperatingHours(updated.getOperatingHours());
        if (updated.getServicesOffered() != null) branch.setServicesOffered(updated.getServicesOffered());
        return branchRepository.save(branch);
    }

    @Transactional
    public Branch closeBranch(Long id) {
        Branch branch = getBranch(id);
        branch.setIsActive(false);
        branch.setClosedDate(java.time.LocalDate.now());
        log.info("Branch closed: code={}", branch.getBranchCode());
        return branchRepository.save(branch);
    }
}
