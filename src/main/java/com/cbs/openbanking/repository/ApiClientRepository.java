package com.cbs.openbanking.repository;

import com.cbs.openbanking.entity.ApiClient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface ApiClientRepository extends JpaRepository<ApiClient, Long> {
    Optional<ApiClient> findByClientId(String clientId);
    List<ApiClient> findByClientTypeAndIsActiveTrue(String clientType);
    List<ApiClient> findByIsActiveTrueOrderByClientNameAsc();
}
