package com.cbs.openitem.service;

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

    @Transactional
    public OpenItem create(OpenItem item) {
        if (!StringUtils.hasText(item.getItemCode())) {
            item.setItemCode("OI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        }
        item.setAgingDays(0);
        item.setStatus("OPEN");
        return repository.save(item);
    }

    @Transactional
    public OpenItem assign(String itemCode, String assignedTo, String assignedTeam) {
        OpenItem item = getByCode(itemCode);
        item.setAssignedTo(assignedTo);
        item.setAssignedTeam(assignedTeam);
        item.setStatus("INVESTIGATING");
        return repository.save(item);
    }

    @Transactional
    public OpenItem resolve(String itemCode, String resolutionAction, String notes) {
        OpenItem item = getByCode(itemCode);
        if ("RESOLVED".equals(item.getStatus())) {
            throw new BusinessException("Open item " + itemCode + " is already RESOLVED");
        }
        item.setResolutionAction(resolutionAction);
        item.setResolutionNotes(notes);
        item.setResolvedAt(Instant.now());
        item.setStatus("RESOLVED");
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
