package com.cbs.integration;

import com.cbs.integration.repository.Iso20022CodeSetRepository;
import com.cbs.integration.repository.Iso20022MessageRepository;
import com.cbs.integration.service.Iso20022Service;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.SchemaFactory;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class Iso20022MessageTest {

    @Mock
    private Iso20022MessageRepository messageRepository;
    @Mock
    private Iso20022CodeSetRepository codeSetRepository;

    @InjectMocks
    private Iso20022Service iso20022Service;

    @Test
    @DisplayName("pacs.008 credit transfer message validates against XSD schema")
    void iso20022Pacs008Validation() throws Exception {
        String message = iso20022Service.buildPacs008(
                new Iso20022Service.CreditTransferDetails(
                        "MSG-001",
                        "INSTR-001",
                        "E2E-001",
                        Instant.parse("2026-03-18T10:15:30Z"),
                        "JOHN DOE",
                        "JANE DOE",
                        new BigDecimal("5000.00"),
                        "USD"
                )
        );

        assertThat(validate(message, "/xsd/pacs.008.001.10.xsd")).isTrue();
    }

    @Test
    @DisplayName("MT103 maps to pacs.008 for SWIFT-to-ISO migration")
    void swiftMt103MapsToPacs008() {
        assertThat(iso20022Service.getSwiftToIsoMapping().get("MT103")).isEqualTo("pacs.008.001.10");
    }

    private boolean validate(String xml, String xsdResourcePath) throws IOException {
        SchemaFactory schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        try (InputStream xsd = getClass().getResourceAsStream(xsdResourcePath)) {
            var schema = schemaFactory.newSchema(new StreamSource(xsd));
            var validator = schema.newValidator();
            validator.validate(new StreamSource(new StringReader(xml)));
            return true;
        } catch (SAXException e) {
            return false;
        }
    }
}
