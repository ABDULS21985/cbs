package com.cbs.cardnetwork.repository;
import com.cbs.cardnetwork.entity.CardNetworkMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CardNetworkMembershipRepository extends JpaRepository<CardNetworkMembership, Long> {
    List<CardNetworkMembership> findByNetworkAndStatusOrderByInstitutionNameAsc(String network, String status);
    List<CardNetworkMembership> findByStatusOrderByNetworkAscInstitutionNameAsc(String status);
}
