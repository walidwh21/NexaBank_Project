package com.nexabank.api.error;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Object key) {
        super(resource + " '" + key + "' does not exist");
    }
}
