<?php

use iThemesSecurity\Headers\ITSEC_Headers_Sanitizer;

/**
 * Class ITSEC_Lib_Headers
 *
 * Manages HTTP headers for the Solid Security plugin.
 * Headers can be sent via PHP using or written to server configuration files.
 * To add headers, use `itsec_lib_php_headers` and `itsec_lib_server_config_headers` filters.
 */
final class ITSEC_Lib_Headers {

	/**
	 * The sanitizer for header names and values.
	 *
	 * @var ITSEC_Headers_Sanitizer
	 */
	private ITSEC_Headers_Sanitizer $sanitizer;

	public function __construct( ITSEC_Headers_Sanitizer $sanitizer ) {
		$this->sanitizer = $sanitizer;
	}

	public function run(): void {
		add_filter( 'itsec_filter_apache_server_config_modification', [
			$this,
			'filter_apache_server_config_modification'
		] );
		add_filter( 'itsec_filter_nginx_server_config_modification', [
			$this,
			'filter_nginx_server_config_modification'
		] );
		add_filter( 'itsec_filter_litespeed_server_config_modification', [
			$this,
			'filter_litespeed_server_config_modification'
		] );

		add_action( 'send_headers', [ $this, 'send_from_php' ] );
	}

	/**
	 * Send headers from PHP.
	 *
	 * @action send_headers
	 *
	 * @return void
	 */
	public function send_from_php(): void {
		if ( headers_sent() ) {
			return;
		}

		$headers = apply_filters( 'itsec_lib_php_headers', [] );

		$headers = $this->prepare( $headers );

		if ( count( $headers ) === 0 ) {
			return;
		}

		foreach ( $headers as $name => $value ) {
			header( "{$name}: {$value}" );
		}
	}

	/**
	 * @param array<string, string> $headers
	 *
	 * @return array<string, string>
	 */
	private function prepare( array $headers ): array {
		$result = [];

		foreach ( $headers as $name => $value ) {
			if ( $value === '' ) {
				continue;
			}

			$this->sanitizer->assert_valid_header_name( $name );
			$name = $this->sanitizer->normalize_header_name( $name );

			$result[ $name ] = $value;
		}

		return $result;
	}

	/**
	 * Generate Apache configuration for the registered headers.
	 *
	 * @filter itsec_filter_apache_server_config_modification
	 */
	public function filter_apache_server_config_modification( string $modification ): string {
		$headers = $this->resolve_headers_for_server_config();

		if ( count( $headers ) === 0 ) {
			return $modification;
		}

		$modification .= "\n";
		$modification .= "\t# Security Headers\n";
		$modification .= "\t<IfModule mod_headers.c>\n";

		foreach ( $headers as $name => $value ) {
			$value = $this->sanitizer->sanitize_apache_value( $value );

			$modification .= "\t\tHeader set {$name} \"{$value}\"\n";
		}

		$modification .= "\t</IfModule>\n";

		return $modification;
	}

	/**
	 * Generate Nginx configuration for the registered headers.
	 *
	 * @filter itsec_filter_nginx_server_config_modification
	 */
	public function filter_nginx_server_config_modification( string $modification ): string {
		$headers = $this->resolve_headers_for_server_config();

		if ( count( $headers ) === 0 ) {
			return $modification;
		}

		$modification .= "\n";
		$modification .= "\t# Security Headers\n";

		foreach ( $headers as $name => $value ) {
			$value = $this->sanitizer->sanitize_nginx_value( $value );

			$modification .= "\tadd_header {$name} \"{$value}\";\n";
		}

		return $modification;
	}

	/**
	 * Generate LiteSpeed configuration for the registered headers.
	 *
	 * LiteSpeed uses Apache-compatible syntax, so we can reuse the Apache config method.
	 *
	 * @filter itsec_filter_litespeed_server_config_modification
	 */
	public function filter_litespeed_server_config_modification( string $modification ): string {
		return $this->filter_apache_server_config_modification( $modification );
	}

	/**
	 * Get all headers applicable for server configuration files.
	 *
	 * @return array<string, string> Array of header names mapped to their values.
	 */
	private function resolve_headers_for_server_config(): array {
		return $this->prepare(
			apply_filters( 'itsec_lib_server_config_headers', [] )
		);
	}
}
