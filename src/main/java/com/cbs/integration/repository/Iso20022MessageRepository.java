package com.cbs.integration.repository;

import com.cbs.integration.entity.Iso20022Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface Iso20022MessageRepository extends JpaRepository<Iso20022Message, Long> {
    Optional<Iso20022Message> findByMessageId(String messageId);
    Optional<Iso20022Message> findByBusinessMessageId(String bizMsgId);
    List<Iso20022Message> findByMessageDefinitionAndStatusOrderByCreatedAtDesc(String definition, String status);
    List<Iso20022Message> findBySenderBicOrReceiverBicOrderByCreatedAtDesc(String senderBic, String receiverBic);
    List<Iso20022Message> findByStatusOrderByCreatedAtAsc(String status);
    Optional<Iso20022Message> findByBusinessMessageIdAndSenderBic(String businessMessageId, String senderBic);
}
