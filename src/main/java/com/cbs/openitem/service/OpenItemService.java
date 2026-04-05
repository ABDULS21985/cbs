package com.cbs.openitem.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.openitem.entity.OpenItem;
import com.cbs.openitem.repository.OpenItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class OpenItemService {
    private final OpenItemRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public OpenItem create(OpenItem item) {
        if (item.getItemType() == null || item.getItemType().isBlank()) {
            throw new BusinessException("Item type is required");
        }
        if (item.getAmount() == null) {
            throw new BusinessException("Item amount is required");
        }
        if (item.getValueDate() == null) {
            throw new BusinessException("Value date is required");
        }
        if (!StringUtils.hasText(item.getItemCode())) {
            item.setItemCode("OI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        }
        item.setAgingDays(0);
        item.setStatus("OPEN");
        OpenItem saved = repository.save(item);
        log.info("AUDIT: Open item created: code={}, type={}, amount={}", saved.getItemCode(), saved.getItemType(), saved.getAmount());
        return saved;
    }

    @Transactional
    public OpenItem assign(String itemCode, String assignedTo, String assignedTeam) {
        OpenItem item = getByCode(itemCode);
        if ("RESOLVED".equals(item.getStatus())) {
            throw new BusinessException("Cannot assign resolved item " + itemCode);
        }
        item.setAssignedTo(assignedTo);
        item.setAssignedTeam(assignedTeam);
        item.setStatus("INVESTIGATING");
        log.info("AUDIT: Open item assigned: code={}, assignedTo={}, team={}", itemCode, assignedTo, assignedTeam);
        return repository.save(item);
    }

    @Transactional
    public OpenItem resolve(String itemCode, String resolutionAction, String notes) {
        OpenItem item = getByCode(itemCode);
        if ("RESOLVED".equals(item.getStatus())) {
            throw new BusinessException("Open item " + itemCode + " is already RESOLVED");
        }
        if (resolutionAction == null || resolutionAction.isBlank()) {
            throw new BusinessException("Resolution action is required");
        }
        // Recalculate aging at resolution time
        if (item.getValueDate() != null) {
            item.setAgingDays((int) ChronoUnit.DAYS.between(item.getValueDate(), LocalDate.now()));
        }
        item.setResolutionAction(resolutionAction);
        item.setResolutionNotes(notes);
        item.setResolvedAt(Instant.now());
        item.setStatus("RESOLVED");
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: Open item resolved: code={}, action={}, agingDays={}, actor={}", itemCode, resolutionAction, item.getAgingDays(), actor);
        return repository.save(item);
    }

    public List<OpenItem> getOpen() {
        return repository.findByStatusInOrderByAgingDaysDesc(List.of("OPEN", "INVESTIGATING", "ESCALATED"));
    }

    public List<OpenItem> getByAssignee(String assignedTo) {
        return repository.findByAssignedToAndStatusInOrderByPriorityAsc(assignedTo, List.of("OPEN", "INVESTIGATING", "ESCALATED"));
    }

    @Transactional
    public int updateAging() {
        List<OpenItem> items = repository.findByStatusInOrderByAgingDaysDesc(List.of("OPEN", "INVESTIGATING", "ESCALATED", "PENDING_APPROVAL"));
        int count = 0;
        for (OpenItem item : items) {
            int days = (int) ChronoUnit.DAYS.between(item.getValueDate(), LocalDate.now());
            item.setAgingDays(days);
            repository.save(item);
            count++;
        }
        return count;
    }

    public OpenItem getByCode(String code) {
        return repository.findByItemCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("OpenItem", "itemCode", code));
    }
}
