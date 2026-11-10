# SkyJourney flight deck

The new cockpit is a physical flight deck viewed from either seat. Its silhouette, molded charcoal panels, machined trim, warm backlighting and cool daylight take cues from the supplied cockpit reference. The windscreen remains open and readable on approach. The display faces, controls and windshield are part of the same scene.

The primary display, navigation map, engine indications, systems pages and mode control panel use the simulation's own state and targets. The map has selectable ranges and shows the actual airport and active route. Systems pages distinguish aircraft configuration, flight data and runway guidance. Brightness, range and page can be set from the cockpit controls or Camera panel and are remembered. A visual runway guide does not imply an ILS receiver or autoland.

Materials, lights and instruments are procedural. Keep the standalone HTML, reuse the existing controls and flight model, and limit updates and draw calls so the cockpit remains playable.
