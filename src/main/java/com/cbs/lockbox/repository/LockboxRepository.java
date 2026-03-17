package com.cbs.lockbox.repository;
import com.cbs.lockbox.entity.Lockbox;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface LockboxRepository extends JpaRepository<Lockbox, Long> {
    Optional<Lockbox> findByLockboxNumber(String number);
    List<Lockbox> findByCustomerIdAndIsActiveTrueOrderByLockboxNumberAsc(Long customerId);
}
