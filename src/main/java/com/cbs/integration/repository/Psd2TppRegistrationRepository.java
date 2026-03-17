package com.cbs.integration.repository;

import com.cbs.integration.entity.Psd2TppRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface Psd2TppRegistrationRepository extends JpaRepository<Psd2TppRegistration, Long> {
    Optional<Psd2TppRegistration> findByTppId(String tppId);
    List<Psd2TppRegistration> findByTppTypeAndStatusOrderByTppNameAsc(String tppType, String status);
    List<Psd2TppRegistration> findByStatusOrderByTppNameAsc(String status);
}
