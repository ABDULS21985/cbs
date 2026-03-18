package com.cbs.branchnetwork.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.branchnetwork.entity.BranchNetworkPlan;
import com.cbs.branchnetwork.repository.BranchNetworkPlanRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BranchNetworkService {
    private final BranchNetworkPlanRepository repository;
    @Transactional public BranchNetworkPlan create(BranchNetworkPlan p) { p.setPlanCode("BNP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase()); p.setStatus("PROPOSED"); return repository.save(p); }
    @Transactional public BranchNetworkPlan approve(String code) { BranchNetworkPlan p = getByCode(code); p.setStatus("APPROVED"); return repository.save(p); }
    @Transactional public BranchNetworkPlan complete(String code) { BranchNetworkPlan p = getByCode(code); p.setActualCompletion(LocalDate.now()); p.setStatus("COMPLETED"); return repository.save(p); }
    public List<BranchNetworkPlan> getByRegion(String region) { return repository.findByRegionOrderByPlannedStartDesc(region); }
    public List<BranchNetworkPlan> getByStatus(String status) { return repository.findByStatusOrderByPlannedStartAsc(status); }
    public BranchNetworkPlan getByCode(String code) { return repository.findByPlanCode(code).orElseThrow(() -> new ResourceNotFoundException("BranchNetworkPlan", "planCode", code)); }
}
