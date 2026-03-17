package com.cbs.loyalty.repository;
import com.cbs.loyalty.entity.LoyaltyProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface LoyaltyProgramRepository extends JpaRepository<LoyaltyProgram, Long> {
    Optional<LoyaltyProgram> findByProgramCode(String code);
    List<LoyaltyProgram> findByIsActiveTrueOrderByProgramNameAsc();
}
