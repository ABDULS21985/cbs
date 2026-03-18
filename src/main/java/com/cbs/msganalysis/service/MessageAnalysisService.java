package com.cbs.msganalysis.service;
import com.cbs.msganalysis.entity.MessageAnalysis;
import com.cbs.msganalysis.repository.MessageAnalysisRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class MessageAnalysisService {
    private final MessageAnalysisRepository analysisRepository;
    @Transactional
    public MessageAnalysis analyze(MessageAnalysis analysis) {
        analysis.setAnalysisId("MA-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        MessageAnalysis saved = analysisRepository.save(analysis);
        if ("FAIL".equals(saved.getResult()) || "CRITICAL".equals(saved.getSeverity()))
            log.warn("Message analysis FAIL: id={}, type={}, rule={}", saved.getAnalysisId(), saved.getAnalysisType(), saved.getRuleTriggered());
        return saved;
    }
    public List<MessageAnalysis> getByMessage(String messageRef) { return analysisRepository.findByMessageRefOrderByCreatedAtDesc(messageRef); }
    public List<MessageAnalysis> getActionRequired() { return analysisRepository.findByResultAndAutoActionOrderByCreatedAtDesc("FAIL", "HOLD"); }
}
