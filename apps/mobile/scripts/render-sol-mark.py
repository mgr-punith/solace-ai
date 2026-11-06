"""Render the checked-in SVG mark with the system's librsvg (no app dependency)."""
from pathlib import Path
import ctypes
import ctypes.util

root = Path(__file__).resolve().parents[1]
rsvg = ctypes.CDLL(ctypes.util.find_library('rsvg-2'))
cairo = ctypes.CDLL(ctypes.util.find_library('cairo'))
gobject = ctypes.CDLL(ctypes.util.find_library('gobject-2.0'))
rsvg.rsvg_handle_new_from_file.argtypes = [ctypes.c_char_p, ctypes.c_void_p]
rsvg.rsvg_handle_new_from_file.restype = ctypes.c_void_p
rsvg.rsvg_handle_render_cairo.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
cairo.cairo_image_surface_create.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int]
cairo.cairo_image_surface_create.restype = ctypes.c_void_p
cairo.cairo_create.argtypes = [ctypes.c_void_p]
cairo.cairo_create.restype = ctypes.c_void_p
cairo.cairo_surface_write_to_png.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
cairo.cairo_destroy.argtypes = [ctypes.c_void_p]
cairo.cairo_surface_destroy.argtypes = [ctypes.c_void_p]
gobject.g_object_unref.argtypes = [ctypes.c_void_p]
handle = rsvg.rsvg_handle_new_from_file(str(root / 'assets/source/sol-mark.svg').encode(), None)
if not handle:
    raise RuntimeError('Could not load Sol SVG')
surface = cairo.cairo_image_surface_create(0, 440, 440)
context = cairo.cairo_create(surface)
try:
    if not rsvg.rsvg_handle_render_cairo(handle, context):
        raise RuntimeError('Could not render Sol SVG')
    status = cairo.cairo_surface_write_to_png(surface, str(root / 'assets/sol-mark.png').encode())
    if status:
        raise RuntimeError('Could not save Sol PNG')
finally:
    cairo.cairo_destroy(context)
    cairo.cairo_surface_destroy(surface)
    gobject.g_object_unref(handle)
