package com.cbs.interbankrel.service;

import com.cbs.interbankrel.entity.InterbankRelationship;
import com.cbs.interbankrel.repository.InterbankRelationshipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class InterbankRelationshipService {

    private final InterbankRelationshipRepository relationshipRepository;

    @Transactional
    public InterbankRelationship create(InterbankRelationship rel) {
        rel.setRelationshipCode("IBR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return relationshipRepository.save(rel);
    }

    public List<InterbankRelationship> getByType(String type) {
        return relationshipRepository.findByRelationshipTypeAndStatusOrderByBankNameAsc(type, "ACTIVE");
    }

    public List<InterbankRelationship> getAll() {
        return relationshipRepository.findByStatusOrderByBankNameAsc("ACTIVE");
    }
}
