package com.cbs.modelops.repository;
import com.cbs.modelops.entity.ModelLifecycleEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface ModelLifecycleEventRepository extends JpaRepository<ModelLifecycleEvent, Long> {
    Optional<ModelLifecycleEvent> findByEventCode(String code);
    List<ModelLifecycleEvent> findByModelCodeOrderByEventDateDesc(String modelCode);
    List<ModelLifecycleEvent> findByEventTypeAndStatusOrderByEventDateDesc(String eventType, String status);
}
