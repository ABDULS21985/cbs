package com.cbs.msganalysis.repository;
import com.cbs.msganalysis.entity.MessageAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MessageAnalysisRepository extends JpaRepository<MessageAnalysis, Long> {
    List<MessageAnalysis> findByMessageRefOrderByCreatedAtDesc(String messageRef);
    List<MessageAnalysis> findByResultAndAutoActionOrderByCreatedAtDesc(String result, String action);
    List<MessageAnalysis> findBySeverityOrderByCreatedAtDesc(String severity);
    List<MessageAnalysis> findByAnalysisTypeOrderByCreatedAtDesc(String analysisType);
    boolean existsByMessageRefAndAnalysisType(String messageRef, String analysisType);
}
