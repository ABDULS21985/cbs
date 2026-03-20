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
    public List<ContactCenter> getActiveCenters() { return centerRepository.findByIsActiveTrueOrderByCenterNameAsc(); }
    public List<ContactInteraction> getAllInteractions() { return interactionRepository.findAll(); }

    private ContactInteraction getInteraction(String id) {
        return interactionRepository.findByInteractionId(id)
                .orElseThrow(() -> new ResourceNotFoundException("ContactInteraction", "interactionId", id));
    }
}
