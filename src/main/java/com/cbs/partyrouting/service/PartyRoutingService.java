package com.cbs.partyrouting.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.partyrouting.entity.PartyRoutingProfile;
import com.cbs.partyrouting.repository.PartyRoutingProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PartyRoutingService {

    private final PartyRoutingProfileRepository profileRepository;

    @Transactional
    public PartyRoutingProfile upsert(PartyRoutingProfile profile) {
        return profileRepository.findByCustomerId(profile.getCustomerId())
                .map(existing -> {
                    existing.setPreferredChannel(profile.getPreferredChannel());
                    existing.setPreferredLanguage(profile.getPreferredLanguage());
                    existing.setAssignedRmId(profile.getAssignedRmId());
                    existing.setServiceTier(profile.getServiceTier());
                    existing.setContactPreferences(profile.getContactPreferences());
                    existing.setUpdatedAt(Instant.now());
                    return profileRepository.save(existing);
                })
                .orElseGet(() -> profileRepository.save(profile));
    }

    public PartyRoutingProfile getByCustomer(Long customerId) {
        return profileRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("PartyRoutingProfile", "customerId", customerId));
    }

    public List<PartyRoutingProfile> getByRm(String rmId) {
        return profileRepository.findByAssignedRmIdOrderByCustomerIdAsc(rmId);
    }
}
