package com.cbs.modelops.service;
import com.cbs.modelops.entity.ModelLifecycleEvent;
import com.cbs.modelops.repository.ModelLifecycleEventRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ModelOpsService {
    private final ModelLifecycleEventRepository repository;
    @Transactional public ModelLifecycleEvent recordEvent(ModelLifecycleEvent event) {
        event.setEventCode("MLE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase()); return repository.save(event);
    }
    public List<ModelLifecycleEvent> getByModel(String modelCode) { return repository.findByModelCodeOrderByEventDateDesc(modelCode); }
    public List<ModelLifecycleEvent> getAlerts() { return repository.findByEventTypeAndStatusOrderByEventDateDesc("MONITORING_ALERT", "RECORDED"); }
}
