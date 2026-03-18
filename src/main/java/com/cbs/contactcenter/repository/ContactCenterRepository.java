package com.cbs.contactcenter.repository;
import com.cbs.contactcenter.entity.ContactCenter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface ContactCenterRepository extends JpaRepository<ContactCenter, Long> {
    Optional<ContactCenter> findByCenterCode(String code);
    List<ContactCenter> findByIsActiveTrueOrderByCenterNameAsc();
}
