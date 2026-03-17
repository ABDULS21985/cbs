package com.cbs.notionalpool.repository;
import com.cbs.notionalpool.entity.NotionalPoolMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface NotionalPoolMemberRepository extends JpaRepository<NotionalPoolMember, Long> {
    List<NotionalPoolMember> findByPoolIdAndIsActiveTrueOrderByMemberNameAsc(Long poolId);
}
