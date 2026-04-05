package com.cbs.notionalpool.repository;
import com.cbs.notionalpool.entity.NotionalPoolMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface NotionalPoolMemberRepository extends JpaRepository<NotionalPoolMember, Long> {
    List<NotionalPoolMember> findByPoolIdAndIsActiveTrueOrderByMemberNameAsc(Long poolId);
    Optional<NotionalPoolMember> findByPoolIdAndAccountId(Long poolId, Long accountId);
}
