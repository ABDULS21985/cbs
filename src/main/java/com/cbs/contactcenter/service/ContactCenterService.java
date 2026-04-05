package com.cbs.contactcenter.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.contactcenter.entity.*;
import com.cbs.contactcenter.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ContactCenterService {

    private final ContactCenterRepository centerRepository;
    private final ContactInteractionRepository interactionRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ContactCenter createCenter(ContactCenter center) {
        // Validation on createCenter
        if (center.getCenterName() == null || center.getCenterName().isBlank()) {
            throw new BusinessException("Center name is required", "MISSING_CENTER_NAME");
        }
        if (center.getCenterType() == null || center.getCenterType().isBlank()) {
            throw new BusinessException("Center type is required", "MISSING_CENTER_TYPE");
        }
        if (center.getTimezone() == null || center.getTimezone().isBlank()) {
            throw new BusinessException("Timezone is required", "MISSING_TIMEZONE");
        }
        ContactCenter saved = centerRepository.save(center);
        log.info("AUDIT: Contact center created: id={}, name={}, type={}, actor={}",
                saved.getId(), saved.getCenterName(), saved.getCenterType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ContactInteraction startInteraction(ContactInteraction interaction) {
        interaction.setInteractionId("INT-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        interaction.setStatus("QUEUED");
        ContactInteraction saved = interactionRepository.save(interaction);
        log.info("AUDIT: Interaction started: id={}, channel={}, customer={}, actor={}",
                saved.getInteractionId(), saved.getChannel(), saved.getCustomerId(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ContactInteraction assignToAgent(String interactionId, String agentId) {
        ContactInteraction i = getInteraction(interactionId);
        // Validate agent ID is provided
        if (agentId == null || agentId.isBlank()) {
            throw new BusinessException("Agent ID is required for assignment", "MISSING_AGENT_ID");
        }
        // Check agent availability: agent should not have too many active interactions
        long activeAgentInteractions = interactionRepository.countByAgentIdAndStatus(agentId, "ACTIVE");
        if (activeAgentInteractions >= 5) {
            throw new BusinessException("Agent " + agentId + " already has " + activeAgentInteractions
                    + " active interactions and cannot accept more", "AGENT_AT_CAPACITY");
        }
        // Validate interaction status
        if (!"QUEUED".equals(i.getStatus())) {
            throw new BusinessException("Interaction " + interactionId + " must be QUEUED to assign; current: " + i.getStatus(), "INVALID_STATUS");
        }
        i.setAgentId(agentId);
        i.setStatus("ACTIVE");
        i.setWaitTimeSec((int) java.time.Duration.between(i.getStartedAt(), Instant.now()).getSeconds());
        log.info("AUDIT: Interaction assigned: id={}, agent={}, waitTime={}s, actor={}",
                interactionId, agentId, i.getWaitTimeSec(), currentActorProvider.getCurrentActor());
        return interactionRepository.save(i);
    }

    @Transactional
    public ContactInteraction completeInteraction(String interactionId, String disposition, String sentiment, String notes, boolean fcr) {
        ContactInteraction i = getInteraction(interactionId);
        // Validate interaction status before completing
        if ("COMPLETED".equals(i.getStatus())) {
            throw new BusinessException("Interaction " + interactionId + " is already COMPLETED", "ALREADY_COMPLETED");
        }
        if (!"ACTIVE".equals(i.getStatus())) {
            throw new BusinessException("Interaction " + interactionId + " must be ACTIVE to complete; current: " + i.getStatus(), "INVALID_STATUS");
        }
        i.setStatus("COMPLETED");
        i.setDisposition(disposition);
        i.setSentiment(sentiment);
        i.setNotes(notes);
        i.setFirstContactResolution(fcr);
        i.setEndedAt(Instant.now());
        i.setHandleTimeSec((int) java.time.Duration.between(i.getStartedAt(), i.getEndedAt()).getSeconds());
        log.info("AUDIT: Interaction completed: id={}, disposition={}, fcr={}, handleTime={}s, actor={}",
                interactionId, disposition, fcr, i.getHandleTimeSec(), currentActorProvider.getCurrentActor());
        return interactionRepository.save(i);
    }

    public List<ContactInteraction> getByCustomer(Long customerId) { return interactionRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }
    public List<ContactInteraction> getAgentInteractions(String agentId) { return interactionRepository.findByAgentIdOrderByStartedAtDesc(agentId); }
    public List<ContactCenter> getActiveCenters() { return centerRepository.findAll(); }
    public List<ContactInteraction> getAllInteractions() { return interactionRepository.findAll(); }

    @Transactional
    public ContactCenter updateCenter(Long id, ContactCenter updates) {
        ContactCenter existing = centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ContactCenter", "id", id));
        if (updates.getCenterName() != null) existing.setCenterName(updates.getCenterName());
        if (updates.getCenterType() != null) existing.setCenterType(updates.getCenterType());
        if (updates.getTimezone() != null) existing.setTimezone(updates.getTimezone());
        if (updates.getOperatingHours() != null) existing.setOperatingHours(updates.getOperatingHours());
        if (updates.getTotalAgents() != null) existing.setTotalAgents(updates.getTotalAgents());
        if (updates.getQueueCapacity() != null) existing.setQueueCapacity(updates.getQueueCapacity());
        if (updates.getServiceLevelTarget() != null) existing.setServiceLevelTarget(updates.getServiceLevelTarget());
        if (updates.getIsActive() != null) existing.setIsActive(updates.getIsActive());
        log.info("AUDIT: Contact center updated: id={}, name={}, actor={}", id, existing.getCenterName(), currentActorProvider.getCurrentActor());
        return centerRepository.save(existing);
    }

    @Transactional
    public ContactCenter deactivateCenter(Long id) {
        ContactCenter center = centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ContactCenter", "id", id));
        center.setIsActive(false);
        log.info("AUDIT: Contact center deactivated: id={}, name={}, actor={}", id, center.getCenterName(), currentActorProvider.getCurrentActor());
        return centerRepository.save(center);
    }

    private ContactInteraction getInteraction(String id) {
        return interactionRepository.findByInteractionId(id)
                .orElseThrow(() -> new ResourceNotFoundException("ContactInteraction", "interactionId", id));
    }
}
