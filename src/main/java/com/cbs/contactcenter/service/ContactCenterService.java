package com.cbs.contactcenter.service;

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

    @Transactional
    public ContactCenter createCenter(ContactCenter center) { return centerRepository.save(center); }

    @Transactional
    public ContactInteraction startInteraction(ContactInteraction interaction) {
        interaction.setInteractionId("INT-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        interaction.setStatus("QUEUED");
        ContactInteraction saved = interactionRepository.save(interaction);
        log.info("Interaction started: id={}, channel={}, customer={}", saved.getInteractionId(), saved.getChannel(), saved.getCustomerId());
        return saved;
    }

    @Transactional
    public ContactInteraction assignToAgent(String interactionId, String agentId) {
        ContactInteraction i = getInteraction(interactionId);
        i.setAgentId(agentId);
        i.setStatus("ACTIVE");
        i.setWaitTimeSec((int) java.time.Duration.between(i.getStartedAt(), Instant.now()).getSeconds());
        log.info("Interaction assigned: id={}, agent={}, waitTime={}s", interactionId, agentId, i.getWaitTimeSec());
        return interactionRepository.save(i);
    }

    @Transactional
    public ContactInteraction completeInteraction(String interactionId, String disposition, String sentiment, boolean fcr) {
        ContactInteraction i = getInteraction(interactionId);
        i.setStatus("COMPLETED");
        i.setDisposition(disposition);
        i.setSentiment(sentiment);
        i.setFirstContactResolution(fcr);
        i.setEndedAt(Instant.now());
        i.setHandleTimeSec((int) java.time.Duration.between(i.getStartedAt(), i.getEndedAt()).getSeconds());
        log.info("Interaction completed: id={}, disposition={}, fcr={}, handleTime={}s", interactionId, disposition, fcr, i.getHandleTimeSec());
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
        log.info("Contact center updated: id={}, name={}", id, existing.getCenterName());
        return centerRepository.save(existing);
    }

    @Transactional
    public ContactCenter deactivateCenter(Long id) {
        ContactCenter center = centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ContactCenter", "id", id));
        center.setIsActive(false);
        log.info("Contact center deactivated: id={}, name={}", id, center.getCenterName());
        return centerRepository.save(center);
    }

    private ContactInteraction getInteraction(String id) {
        return interactionRepository.findByInteractionId(id)
                .orElseThrow(() -> new ResourceNotFoundException("ContactInteraction", "interactionId", id));
    }
}
