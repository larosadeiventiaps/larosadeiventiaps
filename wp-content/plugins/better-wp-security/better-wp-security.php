<?php

/*
 * Plugin Name: Solid Security Basic
 * Plugin URI: https://solidwp.com/products/security
 * Description: Shield your site from cyberattacks and prevent security vulnerabilities. The only security plugin you need for a solid foundation.
 * Author: SolidWP
 * Author URI: https://solidwp.com
 * Version: 9.4.6
 * Text Domain: better-wp-security
 * Network: True
 * License: GPLv2
 * Requires PHP: 7.4
 * Requires at least: 6.5
 */

if ( version_compare( phpversion(), '7.4.0', '<' ) ) {
	function itsec_free_minimum_php_version_notice() {
		echo '<div class="notice notice-error"><p>' . esc_html__( 'Solid Security Basic requires PHP 7.4 or higher.', 'better-wp-security' ) . '</p></div>';
	}

	add_action( 'admin_notices', 'itsec_free_minimum_php_version_notice' );

	return;
}

if ( version_compare( $GLOBALS['wp_version'], '6.5', '<' ) ) {
	function itsec_minimum_wp_version_notice() {
		echo '<div class="notice notice-error"><p>' . esc_html__( 'Solid Security Basic requires WordPress 6.5 or later.', 'better-wp-security' ) . '</p></div>';
	}

	add_action( 'admin_notices', 'itsec_minimum_wp_version_notice' );

	return;
}

/*
 * Register an initial duplicate activation hook to make sure both plugins can't be active at the same time
 * otherwise, remove the activation hook so ITSEC_Core::handle_activation can replace it.
 */
$basic_activate_callback = static function() use ( &$basic_activate_callback ): void {
	$pro_plugin     = 'ithemes-security-pro/ithemes-security-pro.php';
	$active_plugins = (array) get_option( 'active_plugins', [] );

	if ( is_multisite() ) {
		$network_plugins = (array) get_site_option( 'active_sitewide_plugins', [] );
		$active_plugins  = array_merge( $active_plugins, array_keys( $network_plugins ) );
	}

	if ( in_array( $pro_plugin, $active_plugins, true ) ) {
		// No text domain to load here? Might cause PHP notices.

		wp_die(
			esc_html__(
				'Solid Security Basic cannot be activated because Solid Security Pro is already active.',
				'better-wp-security'
			)
		);
	}

	// If we made this far without killing execution, remove this activation hook if Pro isn't
	// active, so ITSEC_Core::handle_activation can get registered.
	remove_action( 'activate_' . plugin_basename( __FILE__ ), $basic_activate_callback );
};

register_activation_hook( __FILE__, $basic_activate_callback );

// Prevent fatal errors if the Pro version is already loaded.
if ( isset( $itsec_dir ) || class_exists( 'ITSEC_Core' ) ) {
	return;
}

if ( file_exists( __DIR__ . '/vendor-prod/autoload.php' ) ) {
	require_once( __DIR__ . '/vendor-prod/autoload.php' );
}

$itsec_dir = dirname( __FILE__ );

if ( is_admin() ) {
	require( "$itsec_dir/lib/icon-fonts/load.php" );
}

require( "$itsec_dir/core/core.php" );
$itsec_core = ITSEC_Core::get_instance();
$itsec_core->init( __FILE__,  'Solid Security Basic' );
