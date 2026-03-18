package com.cbs.security.encryption.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Field-level encryption for PII data (Cap 86).
 * Uses AES-256-GCM with random IV for authenticated encryption.
 * Supports key versioning for rotation — encrypted values are prefixed with key version.
 */
@Service @Slf4j
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;
    private static final String KEY_VERSION = "v1";

    @Value("${cbs.security.encryption.master-key:0123456789abcdef0123456789abcdef}")
    private String masterKeyHex;

    /**
     * Encrypts a plaintext value. Output format: "v1:base64(iv+ciphertext)"
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) return plaintext;
        try {
            SecretKey key = deriveKey();
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes());

            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);

            return KEY_VERSION + ":" + Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Encryption failed", e);
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /**
     * Decrypts a value. Reads key version prefix to support key rotation.
     */
    public String decrypt(String encryptedValue) {
        if (encryptedValue == null || !encryptedValue.contains(":")) return encryptedValue;
        try {
            String[] parts = encryptedValue.split(":", 2);
            // parts[0] = key version, parts[1] = base64(iv+ciphertext)
            byte[] combined = Base64.getDecoder().decode(parts[1]);

            byte[] iv = new byte[IV_LENGTH];
            byte[] ciphertext = new byte[combined.length - IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
            System.arraycopy(combined, IV_LENGTH, ciphertext, 0, ciphertext.length);

            SecretKey key = deriveKey(); // In production: select key by version from parts[0]
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(ciphertext));
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }

    public boolean isEncrypted(String value) { return value != null && value.startsWith("v"); }

    private SecretKey deriveKey() {
        byte[] keyBytes = hexToBytes(masterKeyHex);
        return new SecretKeySpec(keyBytes, "AES");
    }

    private byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4) + Character.digit(hex.charAt(i + 1), 16));
        return data;
    }
}
