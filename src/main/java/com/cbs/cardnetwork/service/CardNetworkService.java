package com.cbs.cardnetwork.service;
import com.cbs.cardnetwork.entity.CardNetworkMembership;
import com.cbs.cardnetwork.repository.CardNetworkMembershipRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CardNetworkService {
    private final CardNetworkMembershipRepository membershipRepository;
    @Transactional
    public CardNetworkMembership register(CardNetworkMembership membership) {
        log.info("Card network membership: network={}, type={}, member={}", membership.getNetwork(), membership.getMembershipType(), membership.getMemberId());
        return membershipRepository.save(membership);
    }
    public List<CardNetworkMembership> getByNetwork(String network) { return membershipRepository.findByNetworkAndStatusOrderByInstitutionNameAsc(network, "ACTIVE"); }
    public List<CardNetworkMembership> getAllActive() { return membershipRepository.findByStatusOrderByNetworkAscInstitutionNameAsc("ACTIVE"); }
}
