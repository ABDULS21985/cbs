package com.cbs.fingateway.repository;
import com.cbs.fingateway.entity.GatewayMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface GatewayMessageRepository extends JpaRepository<GatewayMessage, Long> {
    Optional<GatewayMessage> findByMessageRef(String ref);
    List<GatewayMessage> findByGatewayIdAndDeliveryStatusOrderByQueuedAtAsc(Long gatewayId, String status);
    List<GatewayMessage> findByDeliveryStatusOrderByQueuedAtAsc(String status);
}
