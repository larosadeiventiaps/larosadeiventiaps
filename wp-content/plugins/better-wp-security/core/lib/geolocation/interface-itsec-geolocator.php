<?php

/**
 * Interface ITSEC_Geolocator
 */
interface ITSEC_Geolocator {

	/**
	 * Geolocate an IP address.
	 *
	 * @param string $ip
	 *
	 * @return array{
	 *     label: string,
	 *     credit: string,
	 *     lat?: float,
	 *     long?: float,
	 *     country?: string,
	 *     country_code?: string,
	 * }|WP_Error Label and credit are sanitized.
	 */
	public function geolocate( $ip );

	/**
	 * Is this geolocator available.
	 *
	 * @return bool
	 */
	public function is_available();
}
