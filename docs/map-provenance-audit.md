# OpenBack Map Provenance Audit

## Result

OpenBack ships 135 maps. The machine-readable evidence is in
`resources/maps/provenance.json`:

- 118 maps are inherited from OpenFront open map assets under CC BY-SA 4.0.
- Grand Earth is generated from Natural Earth public-domain data.
- Shattered Expanse is derived from Open Map One by Darklighter Designs under
  CC BY 3.0.
- 15 OpenBack fictional maps now use deterministic original terrain generated
  by `map-generator/tools/create_openback_fictional_maps.py` under CC BY-SA 4.0.
- No shipped map remains in the `unverified-reference` class.

The provenance test binds every record to the SHA-256 hashes of its shipped
manifest and thumbnail. The replacement generator is also rerun in tests to
prove deterministic output and preservation of map metadata.

## Replaced reference-derived terrain

The July 15, 2026 Codex session contained fifteen pictures used by the earlier
map converter. Google Lens searches of the recovered pictures identified the
following origins or strongest exact matches. Public visibility did not grant
OpenBack permission to redistribute or adapt the artwork. These references are
therefore audit evidence only; the pictures are not committed and their
silhouettes are no longer shipped.

| OpenBack map      | Identified earlier reference                                                                      | Evidence                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Therynian Realms  | Reddit mapmaking post, planet Oer/Wyrr                                                            | <https://www.reddit.com/r/mapmaking/comments/1usc0qs/new_project_rough_map_and_continent_names_for_the/>     |
| Fractured Eurasia | “The Eurasian Anarchy” alternate-history map                                                      | <https://www.reddit.com/r/imaginarymaps/comments/1uve86z/the_eurasian_anarchy_eurasia_in_the_year_1915_5/>   |
| Canid Continents  | Jeppe Ringsted, _Caninae — Land of Canines_, commercial Mappa Animalia print                      | <https://jepperingsted.com/products/poster-6>                                                                |
| Heroic Seas       | Chris Zulas, _The Known World of Hyrule_, incorporating Nintendo/Zelda material and other sources | <https://www.reddit.com/r/zelda/comments/1uxmbsm/alloc_chris_zulas_the_known_world_of_hyrule_based/>         |
| Atlas 2026        | Composite world-atlas/biome poster; no uniquely authoritative reusable source established         | No licence evidence recovered                                                                                |
| World of Lur      | Reddit _Victorian Fantasy_ world map                                                              | <https://www.reddit.com/r/imaginarymaps/comments/1umyfsa/victorian_fantasy_ama_about_lore_or_the_map_anime/> |
| Dasserian Realms  | Reddit strategic-campaign map                                                                     | <https://www.reddit.com/r/Roll20/comments/1va32id/help_me_handle_a_large_scale_strategic_pvp/>               |
| Fifteenth Age     | Reddit CK3 total-conversion setting map                                                           | <https://www.reddit.com/r/imaginarymaps/comments/1uktywe/beginning_a_ck3_total_conversion_mod_in_my/>        |
| Mandala Nations   | Reddit _Dead Avatar: Warring States_ map                                                          | <https://www.reddit.com/r/imaginarymaps/comments/1uoh99w/dead_avatarwarring_states_100_years_after_the/>     |
| Calistis          | _Gaïa_ map from _Anima: Beyond Fantasy_                                                           | <https://anima-beyond-fantasy.fandom.com/es/wiki/Ga%C3%AFa>                                                  |
| Mettersind        | jflaxman, _Blood and Oil Regional Map_                                                            | <https://www.deviantart.com/jflaxman/art/Blood-and-Oil-Regional-Map-747598581>                               |
| Avidir            | Reddit homebrew world _Avidír_                                                                    | <https://www.reddit.com/r/DnD/comments/x198y7/oc_art_just_finished_working_on_my_homebrew_world/>            |
| Patchwork Earth   | Flag-painted world map circulated through image aggregators; exact author page not established    | No licence evidence recovered                                                                                |
| Inverted Earth    | Reddit inverted-oceans-and-continents map                                                         | <https://www.reddit.com/r/AlternateHistory/comments/111xyd2/what_if_the_earths_oceans_and_continents_were/>  |
| Maion             | mapclub, _Realistic Map of Maion-Sejon_                                                           | <https://www.deviantart.com/mapclub/art/Realistic-Map-of-Maion-Sejon-39660826>                               |

Reddit states that user content remains owned by its creators and cannot be used
without permission. Pinterest likewise says posters retain their rights and
grants a platform licence for Pinterest's service, not a general licence to
unrelated games. DeviantArt artist pages do not create a redistribution licence,
and Nintendo states that no intellectual-property licence is implied. These
platform rules are why attribution alone was not a sufficient remedy.

## Scope

This is an engineering provenance and licence-evidence audit, not legal advice.
Open licences do not automatically resolve trademarks, privacy, publicity,
moral rights, or other non-copyright restrictions.
