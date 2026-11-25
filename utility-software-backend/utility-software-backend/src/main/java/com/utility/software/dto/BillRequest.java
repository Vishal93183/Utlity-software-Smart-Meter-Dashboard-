package com.utility.software.dto;

/** Give either units, or a meterId (its reading is then used as the units). */
public record BillRequest(Double units, Long meterId) {
}
