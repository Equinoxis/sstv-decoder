export function getAnalyticsCategory() {
  return {
    enabled: true,
    autoClear: {
      cookies: [
        { name: /^_ga/ },
        { name: /^_gid$/ },
        { name: /^_gat/ },
        { name: "_gcl_au" },
        { name: /^_dc_gtm_/ },
        { name: /^_gac_/ },
        { name: "_clck" },
        { name: "_clsk" },
      ],
      reloadPage: true,
    },
    services: {
      google_tag_manager: {
        label: "Google Tag Manager",
      },
      microsoft_clarity: {
        label: "Microsoft Clarity",
      },
    },
  };
}
