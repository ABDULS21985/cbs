package com.cbs.card.repository;

import com.cbs.card.entity.IslamicCardProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicCardProfileRepository extends JpaRepository<IslamicCardProfile, Long> {

    Optional<IslamicCardProfile> findByProfileCode(String profileCode);

    List<IslamicCardProfile> findAllByOrderByProfileCodeAsc();
}